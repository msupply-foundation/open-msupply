use std::sync::Arc;

use repository::SyncVersion;

use crate::sync::is_initialised;
use crate::{
    service_provider::ServiceProvider, settings::Settings, static_files::StaticFileService,
    sync::file_synchroniser::FileSynchroniser,
};

use super::settings::SyncSettings;
use super::CentralServerConfig;
use tokio::{
    sync::{
        mpsc::{self, Receiver, Sender},
        watch,
    },
    time::{timeout, Duration},
};
use util::format_error;

const FILE_SYNC_UPLOAD_DELAY: Duration = Duration::from_millis(100); // This just gives time for a PAUSE message to be received between uploading files
const FILE_SYNC_NO_FILES_DELAY: Duration = Duration::from_millis(10000); // If there's nothing to upload or there was an error, wait a longer before checking again

/// How long to wait before re-checking initialisation state while still uninitialised.
///
/// Unlike the initialised branch, this one has no waker for "initialisation just
/// finished": the only production `Start` sender is the one-shot
/// `SiteIsInitialisedCallback` in server/src/lib.rs. Contrast `SynchroniserDriver`, which
/// *can* safely block on its trigger, because its own trigger is what causes
/// initialisation — this driver has no such intrinsic waker, so it has to poll.
///
/// Kept coarse deliberately: each poll takes a pooled connection and runs the
/// `get_initialisation_status` queries, and the pre-initialisation window is the DB-hottest
/// phase of a site's life (initial integration). Latency after initialisation doesn't
/// matter — nothing is uploadable before initialisation, and steady state already idles for
/// FILE_SYNC_NO_FILES_DELAY. Once initialised the `IS_INITIALISED` latch means no queries
/// at all.
#[cfg(not(test))]
const FILE_SYNC_NOT_INITIALISED_DELAY: Duration = Duration::from_secs(5);
/// Tests flip initialisation state by hand and assert on the next poll.
#[cfg(test)]
const FILE_SYNC_NOT_INITIALISED_DELAY: Duration = Duration::from_millis(50);

pub enum FileSyncMessage {
    Start, // Start sync (could be manual trigger, or automatic on server startup)
    Stop,  // Stop sync (could be manual trigger, or automatic on server shutdown)
}

pub struct FileSyncDriver {
    receiver: Receiver<FileSyncMessage>,
    static_file_service: Arc<StaticFileService>,
    /// Pause is a *state* (currently paused or not), not an event — `FileSyncTrigger::pause` /
    /// `unpause` write to this watch synchronously so the transition takes effect immediately
    /// even while the driver is mid-file. The chunk loop in `SyncApiV6::upload_file` reads the
    /// current value via `borrow()` after each tus PATCH ACK and yields cleanly if set.
    pause_rx: watch::Receiver<bool>,
}

#[derive(Clone)]
pub struct FileSyncTrigger {
    sender: Sender<FileSyncMessage>,
    pause_tx: Arc<watch::Sender<bool>>,
}

/// Used to 'drive' file sync synchronisation, it's tasks:
/// * Expose channel for manually triggering sync
/// * Trigger sync every SyncSettings.interval_seconds (only when initialised)
impl FileSyncDriver {
    pub fn init(settings: &Settings) -> (FileSyncTrigger, FileSyncDriver) {
        let (sender, receiver) = mpsc::channel(10);

        let static_file_service = Arc::new(
            StaticFileService::new(&settings.server.base_dir)
                .expect("Failed to create static file service"),
        );

        // Default to paused so file sync only starts once the first normal `sync` completes and
        // calls unpause(). The watch carries the *state* (paused or not); the mpsc channel above
        // carries lifecycle *events* (Start/Stop).
        let (pause_tx, pause_rx) = watch::channel(true);

        (
            FileSyncTrigger {
                sender,
                pause_tx: Arc::new(pause_tx),
            },
            FileSyncDriver {
                receiver,
                static_file_service,
                pause_rx,
            },
        )
    }

    /// FileSyncDriver entry point, this method is meant to be run within main `select!` macro
    /// should fail only when database is not accessible or when all receivers were dropped
    ///
    ///
    /// Operations:
    /// * loop
    ///    * If initialised await for  trigger OR interval sec timeout
    ///    * If not initialised await for start trigger OR re-check initialisation after
    ///      FILE_SYNC_NOT_INITIALISED_DELAY
    ///    * do sync if any of the above were triggered
    pub async fn run(mut self, service_provider: Arc<ServiceProvider>) {
        let mut stopped = false;
        let mut files_to_upload = 0;

        loop {
            // Need to check is_initialised from database on every iteration, since it could have been updated
            if is_initialised(&service_provider) {
                tokio::select! {
                    // Wait for message
                    Some(message) = self.receiver.recv() => {
                        match message {
                            FileSyncMessage::Start => {
                                log::info!("Starting file sync");
                                stopped = false;

                            },
                            FileSyncMessage::Stop => {
                                log::info!("Stopping file sync");
                                stopped = true;
                            },
                        }
                    },
                    // Wake immediately on any pause/unpause transition so an unpause doesn't sit
                    // unobserved for up to FILE_SYNC_NO_FILES_DELAY. The match against Ok ignores
                    // sender-dropped errors (which only happen during shutdown).
                    Ok(()) = self.pause_rx.changed() => {},
                    // OR wait between downloading files
                    _ = async {
                        if files_to_upload == 0 {
                            tokio::time::sleep(FILE_SYNC_NO_FILES_DELAY).await;
                        } else {
                            tokio::time::sleep(FILE_SYNC_UPLOAD_DELAY).await;
                        }
                    } => {},
                    else => break,
                };
            } else {
                // If not initialised, wait for a lifecycle event OR re-check periodically.
                //
                // Polling rather than blocking, because `Start` is effectively a one-shot in
                // production (SiteIsInitialisedCallback consumes itself after a single
                // message, and FileSyncTrigger::stop is never called) and on the v5/v6
                // initialisation path it is delivered *before* SyncLogger::done writes
                // finished_datetime — i.e. while is_initialised() is still false. Blocking
                // on recv() here therefore spent the only wake-up this driver would ever
                // get and parked it until the next server restart, so no file ever uploaded
                // from a freshly initialised remote (issue #12232).
                //
                // recv() is cancel safe, so the timeout can't drop a message.
                match timeout(FILE_SYNC_NOT_INITIALISED_DELAY, self.receiver.recv()).await {
                    Ok(Some(FileSyncMessage::Start)) => {
                        log::info!("Starting file sync");
                        stopped = false;
                    }
                    Ok(Some(FileSyncMessage::Stop)) => {
                        log::info!("Stopping file sync");
                        stopped = true;
                    }
                    // All senders dropped, which only happens on shutdown. Break rather than
                    // loop: recv() on a closed channel returns immediately, so continuing
                    // would spin. Matches SynchroniserDriver::run, and the resulting
                    // `unreachable!("File sync unexpectedly stopped")` in server/src/lib.rs
                    // is the intended loud failure rather than an oversight.
                    Ok(None) => break,
                    // Timed out: re-check initialisation at the top of the loop. `continue`
                    // rather than falling through, so "no file sync before initialisation"
                    // stays a hard gate — below this branch the only remaining guard is
                    // `paused`, and get_sync_settings expects settings to exist.
                    Err(_elapsed) => continue,
                }
            }

            // Snapshot pause state into a local so the `watch::Ref` borrow guard
            // is dropped before the `.await` below — otherwise the guard lives
            // across the await point and the whole `run` future becomes !Send.
            let paused = *self.pause_rx.borrow();

            // If not stopped or paused and we have a central server URL to upload to
            // (file bytes only ever transfer remote ↔ central, never on central itself)
            if !stopped && !paused {
                if let Some(url) = file_sync_central_url(&service_provider) {
                    files_to_upload = self
                        .sync(&url, service_provider.clone(), self.pause_rx.clone())
                        .await;
                }
            }
        }
    }

    pub async fn sync(
        &self,
        sync_v6_url: &str,
        service_provider: Arc<ServiceProvider>,
        pause_rx: watch::Receiver<bool>,
    ) -> usize {
        // ...Try to upload a file

        let synchroniser = FileSynchroniser::new(
            sync_v6_url,
            get_sync_settings(&service_provider),
            service_provider,
            self.static_file_service.clone(),
        );

        let synchroniser = match synchroniser {
            Ok(synchroniser) => synchroniser,
            Err(error) => {
                log::error!("Problem creating file synchroniser {error:#?}");
                return 0;
            }
        };

        let result = synchroniser.sync(pause_rx).await;

        let files_to_upload = match result {
            Ok(num_of_files) => num_of_files,
            Err(error) => {
                log::error!("Problem syncing files {}", format_error(&error));
                0 // Assume there's no files to upload...
            }
        };

        if files_to_upload > 0 {
            log::info!("Found {files_to_upload} files to upload");
        }

        files_to_upload
    }
}

impl FileSyncTrigger {
    pub fn start(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::Start) {
            log::error!("Problem starting file sync {error:#?}")
        }
    }

    pub fn stop(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::Stop) {
            log::error!("Problem stopping file sync {error:#?}")
        }
    }

    pub fn pause(&self) {
        // Set the shared state synchronously rather than enqueuing a channel message. The driver
        // doesn't poll its mpsc receiver while a file upload is in flight, so a channel-delivered
        // pause would only be observed after the current file finished — defeating the per-chunk
        // pause boundary in `SyncApiV6::upload_file`. send_replace never blocks and returns the
        // previous value, which we don't need.
        log::info!("Pausing file sync");
        self.pause_tx.send_replace(true);
    }

    pub fn unpause(&self) {
        log::info!("Unpausing file sync");
        self.pause_tx.send_replace(false);
    }
}

// Should this really be inside FileSyncrhoniser::new ? (similar with other sync)
pub fn get_sync_settings(service_provider: &ServiceProvider) -> SyncSettings {
    let ctx = service_provider.basic_context().unwrap();
    service_provider
        .settings
        .sync_settings(&ctx)
        .unwrap()
        .expect("Sync settings should be in database after initialisation was started")
}

/// Resolve the central server URL used to transfer file bytes (upload and on-demand
/// download). File bytes only ever move remote ↔ central, so `None` means this server
/// has no upstream to transfer with: it *is* the central server, or sync isn't
/// configured/initialised yet.
///
/// V5/V6 sites learn the OMS central URL from v5 site info (`CentralServerConfig`);
/// V7 sites sync directly against the URL in their sync settings.
pub fn file_sync_central_url(service_provider: &ServiceProvider) -> Option<String> {
    if CentralServerConfig::is_central_server() {
        return None;
    }

    let ctx = match service_provider.basic_context() {
        Ok(ctx) => ctx,
        Err(error) => {
            log::error!("Failed to get context for file sync url: {error:#?}");
            return None;
        }
    };

    match SyncVersion::get(&ctx.connection, false) {
        Ok(SyncVersion::V7) => match service_provider.settings.sync_settings(&ctx) {
            Ok(settings) => settings.map(|s| s.url),
            Err(error) => {
                log::error!("Failed to read sync settings for file sync url: {error:#?}");
                None
            }
        },
        Ok(SyncVersion::V5V6) => match CentralServerConfig::get() {
            CentralServerConfig::CentralServerUrl(url) => Some(url),
            _ => None,
        },
        Err(error) => {
            log::error!("Failed to read sync version for file sync url: {error:#?}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, SyncFileDirection, SyncFileReferenceRow,
        SyncFileReferenceRowRepository, SyncFileStatus, SyncLogV5V6Row, SyncLogV5V6RowRepository,
    };
    use std::time::Instant;

    use super::*;
    use crate::{
        sync::{
            test_util_set_central_server_url, test_util_set_is_central_server,
            test_util_set_is_initialised,
        },
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn file_sync_central_url_dispatches_on_sync_version() {
        let (_, connection, connection_manager, _) =
            setup_all("file_sync_central_url", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);

        // Nothing configured — no URL
        assert_eq!(file_sync_central_url(&service_provider), None);

        // V5/V6 site (fresh DBs are stamped V7 by migrations, so set it explicitly):
        // URL comes from CentralServerConfig (learned via v5 site info)
        SyncVersion::set(&connection, SyncVersion::V5V6).unwrap();
        test_util_set_central_server_url("http://central-oms:2000".to_string());
        assert_eq!(
            file_sync_central_url(&service_provider),
            Some("http://central-oms:2000".to_string())
        );

        // V7 site: URL comes straight from sync settings
        SyncVersion::set(&connection, SyncVersion::V7).unwrap();
        let ctx = service_provider.basic_context().unwrap();
        service_provider
            .settings
            .update_sync_settings(
                &ctx,
                &SyncSettings {
                    url: "http://central-v7:8000".to_string(),
                    username: "site".to_string(),
                    password_sha256: "abc".to_string(),
                    interval_seconds: 300,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            file_sync_central_url(&service_provider),
            Some("http://central-v7:8000".to_string())
        );

        // The central server itself never has an upstream to transfer file bytes with
        test_util_set_is_central_server(true);
        assert_eq!(file_sync_central_url(&service_provider), None);
    }

    /// Regression test for issue #12232 — support upload files never sync from a remote site
    /// after a fresh initialisation.
    ///
    /// `Start` is effectively a one-shot in production, and on the v5/v6 initialisation path
    /// `run_post_sync_triggers` used to fire it from inside `sync_inner`, before
    /// `SyncLogger::done` writes finished_datetime. The driver therefore consumed `Start`
    /// while `is_initialised()` was still false, and then parked on an unbounded
    /// `recv().await` forever.
    ///
    /// This reproduces that exact ordering: deliver `Start` while uninitialised, then
    /// initialise the site behind the driver's back with no further `Start`. A driver that
    /// only ever wakes on `Start` can never notice.
    #[actix_rt::test]
    async fn file_sync_driver_recovers_when_start_arrives_before_initialisation() {
        const FILE_ID: &str = "issue_12232_file";

        let ServiceTestContext {
            service_provider,
            service_context,
            settings,
            connection,
            ..
        } = setup_all_and_service_provider(
            "file_sync_driver_start_before_initialised",
            MockDataInserts::none(),
        )
        .await;

        // Pin the process globals the driver reads, so this test doesn't inherit whatever
        // another test in this binary left behind (nextest gives each test its own process,
        // plain `cargo test` does not).
        test_util_set_is_initialised(false);
        // V5/V6 remote — the driver resolves the upload URL from CentralServerConfig. The URL
        // is never dialled: the seeded row has no bytes on disk, so FileSynchroniser::sync
        // fails at find_file before any HTTP happens.
        SyncVersion::set(&connection, SyncVersion::V5V6).unwrap();
        test_util_set_central_server_url("http://central-oms.invalid:2000".to_string());

        // Sync settings must exist before the site can look initialised:
        // get_initialisation_status unwraps them, and the driver's get_sync_settings expects
        // them.
        service_provider
            .settings
            .update_sync_settings(
                &service_context,
                &SyncSettings {
                    url: "http://legacy.invalid:8080".to_string(),
                    username: "site".to_string(),
                    password_sha256: "abc".to_string(),
                    interval_seconds: 300,
                    ..Default::default()
                },
            )
            .unwrap();

        // A file waiting to be uploaded. The driver reaching FileSynchroniser::sync is
        // observable as New -> InProgress: that status is written before the bytes are looked
        // for on disk, and nothing else writes it. We're asserting the driver woke up, not
        // that an upload succeeded, so no HTTP mock is needed.
        let file_repo = SyncFileReferenceRowRepository::new(&connection);
        file_repo
            .upsert_without_changelog(&SyncFileReferenceRow {
                id: FILE_ID.to_string(),
                table_name: "invoice".to_string(),
                record_id: "issue_12232_record".to_string(),
                file_name: "test.txt".to_string(),
                total_bytes: 4,
                direction: SyncFileDirection::Upload,
                status: SyncFileStatus::New,
                ..Default::default()
            })
            .unwrap();
        let status = || file_repo.find_one_by_id(FILE_ID).unwrap().unwrap().status;

        let (trigger, driver) = FileSyncDriver::init(&settings);
        let driver_task = tokio::spawn(driver.run(service_provider.clone()));

        // The buggy ordering: `Start` lands while the site still looks uninitialised, so it is
        // consumed for nothing.
        trigger.start();
        tokio::time::sleep(Duration::from_millis(200)).await;
        assert_eq!(
            status(),
            SyncFileStatus::New,
            "driver must not touch pending uploads before initialisation"
        );

        // Initialise the site behind the driver's back — this is what SyncLogger::done does at
        // the end of a v5/v6 sync — then unpause, as SynchroniserDriver::sync does when its
        // cycle finishes. Note there is no second `Start`: the one-shot is spent.
        SyncLogV5V6RowRepository::new(&connection)
            .upsert_one(&SyncLogV5V6Row {
                id: "issue_12232_sync_log".to_string(),
                started_datetime: chrono::Utc::now().naive_utc(),
                finished_datetime: Some(chrono::Utc::now().naive_utc()),
                ..Default::default()
            })
            .unwrap();
        assert!(service_provider
            .sync_status_service
            .is_initialised(&service_context)
            .unwrap());
        trigger.unpause();

        // Poll rather than sleeping a fixed amount, so the assertion isn't coupled to
        // FILE_SYNC_NOT_INITIALISED_DELAY.
        let deadline = Instant::now() + Duration::from_secs(5);
        while status() == SyncFileStatus::New {
            assert!(
                Instant::now() < deadline,
                "FileSyncDriver never picked up the pending upload after initialisation — \
                 it is parked on the not-initialised recv().await (issue #12232)"
            );
            tokio::time::sleep(Duration::from_millis(25)).await;
        }

        driver_task.abort();
    }
}
