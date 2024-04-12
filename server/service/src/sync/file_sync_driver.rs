use std::sync::Arc;

use crate::{
    service_provider::ServiceProvider, settings::Settings, static_files::StaticFileService,
    sync::file_synchroniser::FileSynchroniser,
};

use super::settings::SyncSettings;
use tokio::{
    sync::mpsc::{self, Receiver, Sender},
    time::Duration,
};
use util::is_central_server;

const FILE_SYNC_UPLOAD_DELAY: Duration = Duration::from_millis(100); // This just gives time for a PAUSE message to be received between uploading files
const FILE_SYNC_NO_FILES_DELAY: Duration = Duration::from_millis(10000); // If there's nothing to upload or there was an error, wait a longer before checking again

pub enum FileSyncMessage {
    Start,   // Start sync (could be manual trigger, or automatic on server startup)
    Stop,    // Stop sync (could be manual trigger, or automatic on server shutdown)
    Pause, // Pause sync this is called by the main sync process to pause the file sync during a normal sync operation
    UnPause, // Restart sync if it's not Stopped
}

pub struct FileSyncDriver {
    receiver: Receiver<FileSyncMessage>,
    static_file_service: Arc<StaticFileService>,
}

#[derive(Clone)]
pub struct FileSyncTrigger {
    sender: Sender<FileSyncMessage>,
}

/// Used to 'drive' file sync synchronisation, it's tasks:
/// * Expose channel for manually triggering sync
/// * Trigger sync every SyncSettings.interval_seconds (only when initialised)
impl FileSyncDriver {
    pub fn init(settings: &Settings) -> (FileSyncTrigger, FileSyncDriver) {
        // We use a multi-element channel so that we don't block sync if someone tries to stop at the same time as a pause message
        let (sender, receiver) = mpsc::channel(10);

        let static_file_service = Arc::new(
            StaticFileService::new(&settings.server.base_dir)
                .expect("Failed to create static file service"),
        );

        (
            FileSyncTrigger { sender },
            FileSyncDriver {
                receiver,
                static_file_service,
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
        // Default to a paused so file sync should un-pause once the first `sync` completes
        let mut stopped = false;
        let mut paused = true;
        let mut files_to_upload = 0;

        loop {
            // Need to check is_initialised from database on every iteration, since it could have been updated
            if is_initialised(&service_provider) {
                tokio::select! {
                    // Wait for message
                    Some(message) = self.receiver.recv() => {
                        match message
                         {
                            FileSyncMessage::Start => {
                                log::info!("Starting file sync");
                                stopped = false;

                            },
                            FileSyncMessage::Stop => {
                                log::info!("Stopping file sync");
                                stopped = true;
                        },
                            FileSyncMessage::Pause => {
                                log::info!("Pausing file sync");
                                paused = true;
                            },
                            FileSyncMessage::UnPause => {
                                log::info!("Unpausing file sync");
                                paused = false;
                            },
                        }
                    },
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
                if let Some(message) = self.receiver.recv().await {
                    match message {
                        FileSyncMessage::Start => {
                            log::info!("Starting file sync");
                            stopped = false;
                        }
                        _ => {}
                    }
                }
            }

            if !stopped && !paused && !is_central_server() {
                // for now we only sync if we're not the central server
                files_to_upload = self.sync(service_provider.clone()).await;
            }
        }
    }

    pub async fn sync(&self, service_provider: Arc<ServiceProvider>) -> usize {
        // ...Try to upload a file

        let result = FileSynchroniser::new(
            get_sync_settings(&service_provider),
            service_provider,
            self.static_file_service.clone(),
        )
        .sync()
        .await;

        let files_to_upload = match result {
            Ok(num_of_files) => num_of_files,
            Err(error) => {
                log::error!("Problem syncing files {:#?}", error);
                0 // Assume there's no files to upload...
            }
        };
        if files_to_upload > 0 {
            log::info!("Found {} files to upload", files_to_upload);
        }

        files_to_upload
    }
}

impl FileSyncTrigger {
    pub fn start(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::Start) {
            log::error!("Problem starting file sync {:#?}", error)
        }
    }

    pub fn stop(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::Stop) {
            log::error!("Problem stopping file sync {:#?}", error)
        }
    }

    pub fn pause(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::Pause) {
            log::error!("Problem pausing file sync {:#?}", error)
        }
    }

    pub fn unpause(&self) {
        if let Err(error) = self.sender.try_send(FileSyncMessage::UnPause) {
            log::error!("Problem unpausing file sync {:#?}", error)
        }
    }
}

fn is_initialised(service_provider: &ServiceProvider) -> bool {
    let ctx = service_provider.basic_context().unwrap();
    service_provider
        .sync_status_service
        .is_initialised(&ctx)
        .unwrap()
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
