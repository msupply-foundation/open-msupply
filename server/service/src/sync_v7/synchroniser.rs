use std::sync::Arc;

use log::warn;
use repository::{syncv7::SyncError, RepositoryError};
use thiserror::Error;

use crate::{
    service_provider::ServiceProvider, sync::settings::SyncSettings, sync_v7::sync::sync_v7,
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

        sync_v7(
            &self.service_provider,
            &ctx,
            self.settings.clone(),
            !was_initialised,
        )
        .await?;

        Ok(())
    }
}
