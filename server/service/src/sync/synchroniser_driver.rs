use std::{future::Future, sync::Arc};

use crate::service_provider::ServiceProvider;

use super::{settings::SyncSettings, synchroniser::Synchroniser};
use tokio::{
    sync::mpsc::{self, Receiver, Sender},
    time::Duration,
};

pub struct SynchroniserDriver {
    receiver: Receiver<()>,
}

#[derive(Clone)]
pub struct SyncTrigger {
    sender: Sender<()>,
}

/// Used to 'drive' synchronisation, it's tasks:
/// * Expose channel for manually triggering sync
/// * Trigger sync every SyncSettings.interval_seconds (only when initialised)
impl SynchroniserDriver {
    pub fn init() -> (SyncTrigger, SynchroniserDriver) {
        // We use a single-element channel so that we can only have one sync pending at a time.
        // We consume this at the *start* of sync, so we could schedule a sync while syncing.
        // Worst-case scenario, we produce an infinite stream of sync instructions and always go
        // straight from one sync to the next, but that's OK.
        let (sender, receiver) = mpsc::channel(1);

        (SyncTrigger { sender }, SynchroniserDriver { receiver })
    }

    /// SynchroniserDriver entry point, this method is meant to be run within main `select!` macro
    /// should fail only when database is not accessible or when all receivers were dropped
    ///
    /// * `force_run` - shoud we trigger sync straigh await regardless of initialisation stage ?
    ///
    /// Operations:
    /// * Try to sync if already initialise or if `force_run`
    /// * In loop
    ///    * If initialised await for manual trigger OR interval sec timeout
    ///    * If not initialised await onyl for manual trigger
    ///    * do sync if any of the above were triggered
    pub async fn run(mut self, service_provider: Arc<ServiceProvider>, force_run: bool) {
        if force_run || is_initialised(&service_provider) {
            self.sync(service_provider.clone()).await;
        }

        loop {
            // Need to check is_initialsed from database on every iteration, since it could have been updated
            if is_initialised(&service_provider) {
                tokio::select! {
                    // Wait for trigger
                    Some(_) = self.receiver.recv() => {},
                    // OR wait for SyncSettings.interval_seconds
                    _ = async {
                        // Need to get interval_seconds from database on every iteration, since it could have been updated
                        let sync_settings = get_sync_settings(&service_provider);
                        let duration = Duration::from_secs(sync_settings.interval_seconds);
                        tokio::time::sleep(duration).await;
                     } => {},
                    else => break,
                };
            } else {
                // If not initialised just wait for manual trigger
                if self.receiver.recv().await.is_none() {
                    break;
                }
            }

            self.sync(service_provider.clone()).await;
        }
    }

    pub async fn sync(&self, service_provider: Arc<ServiceProvider>) {
        // Error is already logged, keeping result with `_` to avoid compilation warning
        // We initialise new instance of Syncrhoniser since SyncSettings could have changed
        let _ = Synchroniser::new(get_sync_settings(&service_provider), service_provider)
            .unwrap()
            .sync()
            .await;
    }
}

impl SyncTrigger {
    pub fn trigger(&self) {
        if let Err(error) = self.sender.try_send(()) {
            log::error!("Problem triggering sync {:#?}", error)
        }
    }

    pub(crate) fn new_void() -> SyncTrigger {
        SyncTrigger {
            sender: mpsc::channel(1).0,
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

fn get_sync_settings(service_provider: &ServiceProvider) -> SyncSettings {
    let ctx = service_provider.basic_context().unwrap();
    service_provider
        .settings
        .sync_settings(&ctx)
        .unwrap()
        .expect("Sync settings should be in database after initialisation was started")
}

pub struct SiteIsInitialisedTrigger {
    sender: Sender<()>,
}

pub struct SiteIsInitialisedCallback {
    receiver: Receiver<()>,
}

/// Allows for trigger to be called when site has just been initialsed, to allow swapping of
/// graphql schema (see GraphqlSchema)
impl SiteIsInitialisedCallback {
    pub fn init() -> (SiteIsInitialisedTrigger, SiteIsInitialisedCallback) {
        // Could have used oneshot, but it's more difficult because sender is consumed when oneshot is fired
        // and sender lives within ServiceProvider (which is not mutable)
        let (sender, receiver) = mpsc::channel(1);

        (
            SiteIsInitialisedTrigger { sender },
            SiteIsInitialisedCallback { receiver },
        )
    }

    /// Callback to call on trigger
    pub fn on_trigger<T>(mut self, future: T)
    where
        T: Future + Send + 'static,
    {
        // NOTE: We do not await for tokio::spawn or return JoinHandle (this will just run in background)
        tokio::spawn(async move {
            if let Some(_) = self.receiver.recv().await {
                future.await;
            } else {
                log::error!("Cannot receive site is initialised message, sender was dropped")
            };
        });
    }
}

impl SiteIsInitialisedTrigger {
    pub fn trigger(&self) {
        if let Err(error) = self.sender.try_send(()) {
            log::error!("Problem triggering site is initialised {:#?}", error)
        }
    }

    pub(crate) fn new_void() -> SiteIsInitialisedTrigger {
        SiteIsInitialisedTrigger {
            sender: mpsc::channel(1).0,
        }
    }
}
