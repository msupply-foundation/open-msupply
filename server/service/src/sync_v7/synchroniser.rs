use std::sync::Arc;

use log::warn;
use repository::{syncv7::SyncError, ChangelogCondition, KeyType, RepositoryError};
use thiserror::Error;

use crate::{
    cursor_controller::CursorType,
    service_provider::ServiceProvider,
    sync::settings::SyncSettings,
    sync_v7::{
        sync::sync_v7,
        sync_request::{SyncRequest, SyncRequestStep},
        sync_request_runner::run_pending_sync_requests,
    },
};

#[derive(Error, Debug)]
pub enum SynchroniserV7Error {
    #[error(transparent)]
    SyncError(#[from] SyncError),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Sync v7 error: {0}")]
    Other(String),
}

pub struct SynchroniserV7 {
    settings: SyncSettings,
    service_provider: Arc<ServiceProvider>,
}

impl SynchroniserV7 {
    pub fn new(settings: SyncSettings, service_provider: Arc<ServiceProvider>) -> Self {
        SynchroniserV7 {
            settings,
            service_provider,
        }
    }

    pub async fn sync(&self) -> Result<(), SynchroniserV7Error> {
        let ctx = self.service_provider.basic_context()?;

        if self.service_provider.settings.is_sync_disabled(&ctx)? {
            warn!("Sync is disabled, skipping");
            return Ok(());
        }

        // Check both v5_v6 and v7 sync logs — a site upgrading from v5_v6 to v7
        // has a populated sync_log but an empty sync_log_v7, and must not be
        // treated as initialising (which would skip Push/WaitForIntegration).
        let was_initialised = self
            .service_provider
            .sync_status_service
            .is_initialised(&ctx)?;

        // The main sync becomes a specific SyncRequest. During initialisation
        // we have no local data to push and no integration to wait for — the
        // central server hasn't seen this site yet. Skip both steps so the
        // sync_log_v7 row leaves their timestamps null and the UI hides them
        // naturally.
        let request = SyncRequest {
            push: was_initialised.then(|| SyncRequestStep {
                filter: ChangelogCondition::True(),
                cursor_type: CursorType::Standard(KeyType::SyncPushCursorV7),
            }),
            pull: Some(SyncRequestStep {
                filter: ChangelogCondition::True(),
                cursor_type: CursorType::Standard(KeyType::SyncPullCursorV7),
            }),
            reference_id: None,
            is_initialising: !was_initialised,
            run_post_sync_triggers: true,
        };

        sync_v7(&self.service_provider, &ctx, self.settings.clone(), request).await?;

        // Auxiliary sync runs after the main sync once the site is initialised.
        // Persisted sync_request rows (store transfers, post-init backfills,
        // post-migration re-syncs) are picked up here. Errors here don't
        // unwind the main sync, but are returned so the caller can log them.
        if was_initialised {
            run_pending_sync_requests(&self.service_provider, &ctx, &self.settings).await?;
        }

        Ok(())
    }
}
