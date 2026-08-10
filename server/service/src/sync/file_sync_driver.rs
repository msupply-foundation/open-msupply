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
    time::Duration,
};
use util::format_error;

const FILE_SYNC_BETWEEN_FILES_DELAY: Duration = Duration::from_millis(100); // This just gives time for a PAUSE message to be received between uploading or downloading files
const FILE_SYNC_NO_FILES_DELAY: Duration = Duration::from_millis(10000); // If there's nothing to upload or download, or there was an error, wait a longer before checking again

pub enum FileSyncMessage {
    Start, // Start sync (could be manual trigger, or automatic on server startup)
    Stop,  // Stop sync (could be manual trigger, or automatic on server shutdown)
}

pub struct FileSyncDriver {
    receiver: Receiver<FileSyncMessage>,
    static_file_service: Arc<StaticFileService>,
    /// Needed to verify and unpack a downloaded front-end bundle once its bytes land.
    settings: Settings,
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
                settings: settings.clone(),
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
    ///    * If not initialised await only for start trigger
    ///    * do sync if any of the above were triggered
    pub async fn run(mut self, service_provider: Arc<ServiceProvider>) {
        let mut stopped = false;
        let mut files_to_upload = 0;
        let mut files_to_download = 0;

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
                    // OR wait between uploading/downloading files
                    _ = async {
                        if files_to_upload == 0 && files_to_download == 0 {
                            tokio::time::sleep(FILE_SYNC_NO_FILES_DELAY).await;
                        } else {
                            tokio::time::sleep(FILE_SYNC_BETWEEN_FILES_DELAY).await;
                        }
                    } => {},
                    else => break,
                };
            } else {
                // If not initialised, only wait for start trigger
                if let Some(FileSyncMessage::Start) = self.receiver.recv().await {
                    log::info!("Starting file sync");
                    stopped = false;
                }
            }

            // Snapshot pause state into a local so the `watch::Ref` borrow guard
            // is dropped before the `.await` below — otherwise the guard lives
            // across the await point and the whole `run` future becomes !Send.
            let paused = *self.pause_rx.borrow();

            // If not stopped or paused and we have a central server URL to upload to and
            // download from (file bytes only ever move remote ↔ central, never on central
            // itself)
            if !stopped && !paused {
                if let Some(url) = file_sync_central_url(&service_provider) {
                    files_to_upload = self
                        .sync(&url, service_provider.clone(), self.pause_rx.clone())
                        .await;

                    // Uploads first: a site's own data reaching central matters more
                    // than this site catching up on files it has asked for. Both yield
                    // to normal sync via the same pause signal, re-checked here because
                    // the upload above may have taken a while.
                    if !*self.pause_rx.borrow() {
                        files_to_download = self.download(&url, service_provider.clone()).await;
                    }
                }
            }
        }
    }

    /// Verify and unpack a newly downloaded front-end bundle, and point serving at it.
    ///
    /// Deliberately best-effort: a bundle that can't be activated (bad checksum, bad
    /// archive) must not stop file sync or take down the UI — the previous bundle, or the
    /// packaged baseline, keeps serving and the failure is logged.
    fn reconcile_frontend_bundle(&self, service_provider: &Arc<ServiceProvider>) {
        let ctx = match service_provider.basic_context() {
            Ok(ctx) => ctx,
            Err(error) => {
                log::error!("Cannot open a context to activate a bundle: {error:#?}");
                return;
            }
        };

        if let Err(error) = crate::frontend_bundle::reconcile_active_bundle(
            &ctx,
            &self.settings,
            &service_provider.active_frontend_bundle,
        ) {
            log::error!(
                "Could not resolve the active front-end bundle: {}",
                format_error(&error)
            );
        }
    }

    /// Drain one file from the background download queue. Returns how many remain
    /// queued, which the loop above uses to choose its next delay.
    pub async fn download(
        &self,
        sync_v6_url: &str,
        service_provider: Arc<ServiceProvider>,
    ) -> usize {
        let synchroniser = FileSynchroniser::new(
            sync_v6_url,
            get_sync_settings(&service_provider),
            service_provider.clone(),
            self.static_file_service.clone(),
        );

        let synchroniser = match synchroniser {
            Ok(synchroniser) => synchroniser,
            Err(error) => {
                log::error!("Problem creating file synchroniser {error:#?}");
                return 0;
            }
        };

        match synchroniser.download().await {
            Ok(remaining) => {
                if remaining > 0 {
                    log::info!("{remaining} files still queued for download");
                }

                // A download may have completed a front-end bundle. Reconciling is cheap
                // and idempotent when it hasn't, and this is the only moment the bytes
                // can newly be available without a restart.
                self.reconcile_frontend_bundle(&service_provider);

                remaining
            }
            Err(error) => {
                // Per-file failures are already recorded against the row (with a retry
                // schedule); this is the "couldn't even look" case.
                log::error!("Problem downloading files {}", format_error(&error));
                0
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
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use super::*;
    use crate::sync::{test_util_set_central_server_url, test_util_set_is_central_server};

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
}
