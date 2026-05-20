use std::sync::Arc;

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

const FILE_SYNC_UPLOAD_DELAY: Duration = Duration::from_millis(100); // This just gives time for a PAUSE message to be received between uploading files
const FILE_SYNC_NO_FILES_DELAY: Duration = Duration::from_millis(10000); // If there's nothing to upload or there was an error, wait a longer before checking again

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
    ///    * If not initialised await only for start trigger
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
                // If not initialised, only wait for start trigger
                if let Some(FileSyncMessage::Start) = self.receiver.recv().await {
                    log::info!("Starting file sync");
                    stopped = false;
                }
            }

            // If not stopped or paused and we have central server URL
            if let (false, false, CentralServerConfig::CentralServerUrl(url)) =
                (stopped, *self.pause_rx.borrow(), CentralServerConfig::get())
            {
                // for now we only sync if we're not the central server
                files_to_upload = self
                    .sync(&url, service_provider.clone(), self.pause_rx.clone())
                    .await;
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
