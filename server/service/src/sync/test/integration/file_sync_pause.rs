//! End-to-end tests for file-sync pause behaviour on a remote-with-bad-internet
//! topology: real `FileSyncDriver` + `SynchroniserDriver` running in the test
//! process, a real open-mSupply central server receiving the TUS uploads, and
//! toxiproxy throttling the bandwidth between them. The pause/unpause cycles
//! are driven by `SynchroniserDriver::sync()` calling `file_sync_trigger.pause()`
//! before each V5 cycle and `unpause()` after — the production code path — not
//! by a hand-rolled `watch::channel` inside the test.
//!
//! What's covered:
//!
//! 1. `baseline_no_contention` — driver picks up a queued file and completes the
//!    upload through the throttled link when no sync trigger ever fires. Catches
//!    regressions where the pause-default-true initial state leaves the driver
//!    silently dormant.
//! 2. `pause_mid_upload_via_real_sync` — once the driver is mid-upload, the test
//!    fires `sync_trigger.trigger(None)`. `SynchroniserDriver::sync()` pauses
//!    file sync, runs a V5 cycle, unpauses. The upload chunk loop observes the
//!    pause at the next ACK, the file synchroniser persists the chunk-aligned
//!    offset on disk, the driver re-enters via the watch's `changed()` arm after
//!    unpause, and tus HEAD picks up where we left off. Assertions: final status
//!    is `Done`, and a partial `uploaded_bytes` value was observed and lands on
//!    a `CHUNK_SIZE` boundary.
//! 3. `unpause_wakeup_latency` — narrow timing test for the watch-channel arm.
//!    Only the FileSyncDriver runs (no SynchroniserDriver), so the measurement
//!    isn't blurred by sync overhead.
//! 4. `bad_internet_scenario` — multiple files queued, periodic sync triggers
//!    fire throughout. Assertion: every file reaches `Done`, and at least one
//!    of them was observed mid-pause (partial uploaded_bytes), proving the
//!    contention actually happened rather than us lucking into uncontested
//!    uploads.
//!
//! All four require postgres + open-mSupply central + toxiproxy +
//! mock_msupply (or real legacy mSupply) all running — see the docs at
//! `docs/content/server/service/sync/test/integration/_index.md`.

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use chrono::Utc;
    use repository::sync_file_reference_row::{
        SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    };
    use url::Url;

    use crate::{
        static_files::{StaticFileCategory, StaticFileService},
        sync::{
            test::integration::{
                bandwidth_harness::ToxiproxyProxy,
                create_site,
                driver_harness::{
                    record_many, wait_until_uploading, RemoteDrivers, UploadTrace,
                },
                FullSiteConfig,
            },
            test_util_set_central_server_url, CentralServerConfig,
        },
        test_helpers::ServiceTestContext,
    };

    /// 4 MiB matches the private `CHUNK_SIZE` in
    /// `server/service/src/sync/api_v6/upload_file.rs`. Tests assert against
    /// this boundary; keep them in sync if the production value changes.
    const CHUNK_SIZE: usize = 4 * 1024 * 1024;

    /// 4 MiB/s — each 4 MiB chunk ≈ 1s wall time. Slow enough that a sync
    /// triggered shortly after upload starts can pause us between chunks; fast
    /// enough that the whole test stays within a sensible budget.
    const THROTTLE_KBPS: u32 = 4096;

    struct UploadFixture {
        row: SyncFileReferenceRow,
        _file_path: String,
    }

    /// Seeds a local `sync_file_reference` row + a `total_chunks * CHUNK_SIZE`
    /// file on disk inside the test's `base_dir`. The bytes are non-zero so we
    /// can spot accidental zero-fills downstream.
    fn seed_local_file(
        context: &ServiceTestContext,
        identifier: &str,
        total_chunks: usize,
    ) -> UploadFixture {
        let file_id = format!(
            "file-sync-pause-{}-{}",
            identifier,
            Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        let table_name = "rnr_form";
        let record_id = format!("rec-{}", identifier);
        let file_name = "test_payload.bin";
        let total_bytes = total_chunks * CHUNK_SIZE;

        let category = StaticFileCategory::SyncFile(table_name.to_string(), record_id.clone());
        let static_file_service =
            StaticFileService::new(&context.settings.server.base_dir).unwrap();
        let stored = static_file_service
            .reserve_file(file_name, &category, Some(file_id.clone()))
            .unwrap();
        std::fs::write(&stored.path, vec![0xAB; total_bytes]).unwrap();

        let row = SyncFileReferenceRow {
            id: file_id.clone(),
            table_name: table_name.to_string(),
            record_id,
            file_name: file_name.to_string(),
            total_bytes: total_bytes as i32,
            direction: SyncFileDirection::Upload,
            status: SyncFileStatus::New,
            created_datetime: Utc::now().naive_utc(),
            ..Default::default()
        };
        SyncFileReferenceRowRepository::new(&context.connection)
            .upsert_one(&row)
            .unwrap();

        UploadFixture {
            row,
            _file_path: stored.path,
        }
    }

    /// `host:port` extracted from the V6 URL central reports after the first
    /// sync. Toxiproxy upstream points here; the listener URL is what the
    /// remote (the test process) hands to the FileSyncDriver indirectly via
    /// `CentralServerConfig`.
    fn central_upstream_addr() -> String {
        let central_url = match CentralServerConfig::get() {
            CentralServerConfig::CentralServerUrl(url) => url,
            other => panic!(
                "expected CentralServerConfig::CentralServerUrl after sync, got {:?}",
                std::mem::discriminant(&other)
            ),
        };
        let parsed = Url::parse(&central_url)
            .unwrap_or_else(|e| panic!("central URL {} unparseable: {}", central_url, e));
        let host = parsed.host_str().expect("central URL missing host");
        let port = parsed
            .port_or_known_default()
            .expect("central URL missing port and no default for scheme");
        format!("{host}:{port}")
    }

    /// After toxiproxy is in place, override the central URL so the driver
    /// sends its TUS traffic through the proxy listener instead of straight to
    /// central. The driver reads this on every loop iteration, so calling once
    /// before `unpause()` is sufficient.
    fn redirect_central_to_proxy(proxy: &ToxiproxyProxy) {
        test_util_set_central_server_url(proxy.listen_url());
    }

    /// Baseline: throttled upload runs to completion via the FileSyncDriver
    /// when nothing ever raises pause. Catches regressions where pause-default-
    /// true keeps the driver dormant indefinitely, or where the driver fails
    /// to discover a New row via `find_all_to_upload`.
    #[actix_rt::test]
    async fn integration_file_sync_baseline_no_contention() {
        let FullSiteConfig {
            context,
            config: _,
            synchroniser,
        } = create_site("file_sync_baseline_driver", vec![]).await;
        synchroniser.sync(None).await.unwrap();

        let upstream = central_upstream_addr();
        let proxy =
            ToxiproxyProxy::create("file_sync_baseline_driver", "127.0.0.1:22220", &upstream)
                .await;
        proxy.set_bandwidth_kbps(THROTTLE_KBPS).await;
        redirect_central_to_proxy(&proxy);

        let drivers = RemoteDrivers::spawn(context.service_provider.clone(), &context.settings);
        let fixture = seed_local_file(&context, "baseline", 2);

        // Driver defaults paused; unpause to let it pick up the row.
        drivers.file_sync_trigger.unpause();

        let trace = UploadTrace::record(
            &context.connection,
            &fixture.row.id,
            Duration::from_millis(100),
            Duration::from_secs(20),
        )
        .await;

        assert_eq!(
            trace.final_status(),
            SyncFileStatus::Done,
            "expected baseline upload to complete cleanly, final trace: {:?}",
            trace.samples,
        );
    }

    /// Pause raised by a real `SynchroniserDriver::sync()` call mid-upload must
    /// be observed by the chunk loop at the next ACK boundary; the file
    /// synchroniser must persist the chunk-aligned offset; the driver must
    /// re-enter via the watch's `changed()` arm on unpause; tus HEAD must
    /// resume from the durable offset.
    #[actix_rt::test]
    async fn integration_file_sync_pause_mid_upload_via_real_sync() {
        let FullSiteConfig {
            context,
            config: _,
            synchroniser,
        } = create_site("file_sync_pause_mid_driver", vec![]).await;
        synchroniser.sync(None).await.unwrap();

        let upstream = central_upstream_addr();
        let proxy =
            ToxiproxyProxy::create("file_sync_pause_mid_driver", "127.0.0.1:22221", &upstream)
                .await;
        proxy.set_bandwidth_kbps(THROTTLE_KBPS).await;
        redirect_central_to_proxy(&proxy);

        let drivers = RemoteDrivers::spawn(context.service_provider.clone(), &context.settings);
        let fixture = seed_local_file(&context, "pause_mid", 3);
        let total_bytes = fixture.row.total_bytes;

        drivers.file_sync_trigger.unpause();

        // Wait until the driver actually starts processing the row before
        // raising the sync trigger — otherwise the pause could land before the
        // first chunk ACK and the test wouldn't be exercising mid-upload
        // pause, just blocked-start.
        wait_until_uploading(
            &context.connection,
            &fixture.row.id,
            Duration::from_secs(10),
        )
        .await;

        // Now fire a real sync. SynchroniserDriver::sync() will:
        //   1. file_sync_trigger.pause()
        //   2. Synchroniser::sync(None) against the mock — near-instant
        //   3. file_sync_trigger.unpause()
        // The upload's chunk loop returns `Paused` between chunks, the file
        // synchroniser persists `uploaded_bytes = bytes_uploaded` without a
        // status change (so it stays re-pickup-able), and the FileSyncDriver
        // re-enters via the watch arm and continues.
        drivers.sync_trigger.trigger(None);

        let trace = UploadTrace::record(
            &context.connection,
            &fixture.row.id,
            Duration::from_millis(50),
            Duration::from_secs(30),
        )
        .await;

        assert_eq!(
            trace.final_status(),
            SyncFileStatus::Done,
            "expected upload to resume and complete; samples: {:?}",
            trace.samples,
        );

        assert!(
            trace.observed_partial_upload(total_bytes),
            "no sample showed a partial uploaded_bytes value — the chunk loop never \
             returned Paused, so pause/resume via real sync wasn't exercised. samples: {:?}",
            trace.samples,
        );

        let partial = trace
            .max_partial_uploaded_bytes(total_bytes)
            .expect("observed_partial_upload was true but max_partial_uploaded_bytes was None");
        assert_eq!(
            partial as usize % CHUNK_SIZE,
            0,
            "pause persisted at a non-chunk-aligned offset: {} bytes (CHUNK_SIZE = {})",
            partial,
            CHUNK_SIZE,
        );
    }

    /// The watch-channel refactor's specific win: the FileSyncDriver observes
    /// pause→unpause transitions via `pause_rx.changed().await` in its
    /// `select!`, so unpause wakes the loop in ~ms — not after the next
    /// `FILE_SYNC_NO_FILES_DELAY` (10s) poll.
    ///
    /// Observable signal: a pending `sync_file_reference` row whose backing
    /// file does NOT exist. The driver picks it up after unpause, transitions
    /// status from `New` to `InProgress`, then errors out at `find_file`. We
    /// only measure the time between `unpause()` and the first observable
    /// status flip — no network involvement.
    #[actix_rt::test]
    async fn integration_file_sync_unpause_wakeup_latency() {
        let FullSiteConfig {
            context,
            config: _,
            synchroniser,
        } = create_site("file_sync_unpause_latency_driver", vec![]).await;
        // Required so `is_initialised` returns true and the driver enters its
        // full `select!` rather than only awaiting Start.
        synchroniser.sync(None).await.unwrap();

        // File-sync-only variant: we don't want a background SynchroniserDriver
        // firing pause/unpause cycles during the measurement.
        let drivers = RemoteDrivers::spawn_file_sync_only(
            context.service_provider.clone(),
            &context.settings,
        );

        let repo = SyncFileReferenceRowRepository::new(&context.connection);
        let file_id = format!(
            "file-sync-unpause-{}",
            Utc::now().timestamp_nanos_opt().unwrap_or(0)
        );
        repo.upsert_one(&SyncFileReferenceRow {
            id: file_id.clone(),
            table_name: "rnr_form".to_string(),
            record_id: "unpause-latency-rec".to_string(),
            file_name: "absent.bin".to_string(),
            total_bytes: 1024,
            direction: SyncFileDirection::Upload,
            status: SyncFileStatus::New,
            created_datetime: Utc::now().naive_utc(),
            ..Default::default()
        })
        .unwrap();

        // Driver defaults paused; the row must NOT be processed while paused.
        tokio::time::sleep(Duration::from_millis(200)).await;
        let row = repo.find_one_by_id(&file_id).unwrap().unwrap();
        assert_eq!(
            row.status,
            SyncFileStatus::New,
            "row was processed while driver was paused — pause is broken",
        );

        // The measurement: time from unpause() to first observable status flip.
        let started = Instant::now();
        drivers.file_sync_trigger.unpause();

        let mut woke_at = None;
        for _ in 0..50 {
            tokio::time::sleep(Duration::from_millis(20)).await;
            let row = repo.find_one_by_id(&file_id).unwrap().unwrap();
            if row.status != SyncFileStatus::New {
                woke_at = Some(started.elapsed());
                break;
            }
        }

        let elapsed = woke_at.unwrap_or_else(|| {
            panic!(
                "driver did not pick up the row within 1s of unpause() — \
                 changed().await arm in the select! is not waking the loop",
            )
        });

        // Pre-refactor design would have waited up to FILE_SYNC_NO_FILES_DELAY
        // (10s). 500ms gives headroom while still asserting a meaningful bound.
        assert!(
            elapsed < Duration::from_millis(500),
            "unpause wakeup took {:?} — should be ≪ 500 ms",
            elapsed,
        );
    }

    /// The scenario test. Several files queued, periodic background sync
    /// triggers fire throughout the run. Verifies that the whole pipeline
    /// (FileSyncDriver discovery → upload chunk loop → pause via real sync →
    /// resume → next file) holds together under repeated contention.
    #[actix_rt::test]
    async fn integration_file_sync_bad_internet_scenario() {
        let FullSiteConfig {
            context,
            config: _,
            synchroniser,
        } = create_site("file_sync_bad_internet", vec![]).await;
        synchroniser.sync(None).await.unwrap();

        let upstream = central_upstream_addr();
        let proxy =
            ToxiproxyProxy::create("file_sync_bad_internet", "127.0.0.1:22222", &upstream).await;
        proxy.set_bandwidth_kbps(THROTTLE_KBPS).await;
        redirect_central_to_proxy(&proxy);

        let drivers = RemoteDrivers::spawn(context.service_provider.clone(), &context.settings);

        // Three files, 2 chunks each (~8s of throttled upload total). Lets the
        // periodic-sync task land mid-flight at least once.
        let fixtures: Vec<UploadFixture> = (0..3)
            .map(|i| seed_local_file(&context, &format!("scenario_{i}"), 2))
            .collect();
        let total_bytes = fixtures[0].row.total_bytes;
        let file_ids: Vec<String> = fixtures.iter().map(|f| f.row.id.clone()).collect();

        drivers.file_sync_trigger.unpause();

        // Background sync churn for the test duration. 750ms is short enough
        // to overlap with chunk uploads but long enough that successive syncs
        // don't trample each other (SynchroniserDriver's receiver is single-
        // slot, so concurrent triggers are coalesced anyway).
        let sync_trigger = drivers.sync_trigger.clone();
        let churn = tokio::spawn(async move {
            for _ in 0..30 {
                sync_trigger.trigger(None);
                tokio::time::sleep(Duration::from_millis(750)).await;
            }
        });

        let traces = record_many(
            &context.connection,
            &file_ids,
            Duration::from_millis(100),
            Duration::from_secs(60),
        )
        .await;

        churn.abort();

        for (i, trace) in traces.iter().enumerate() {
            assert_eq!(
                trace.final_status(),
                SyncFileStatus::Done,
                "file {} never reached Done; samples: {:?}",
                i,
                trace.samples,
            );
        }

        let any_paused = traces
            .iter()
            .any(|t| t.observed_partial_upload(total_bytes));
        assert!(
            any_paused,
            "no file was observed mid-pause — the sync triggers never overlapped with an \
             upload, so this run didn't actually exercise contention",
        );
    }
}
