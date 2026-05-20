use std::sync::Arc;

use anyhow::Context;
use repository::SyncVersion;

use crate::{service_provider::ServiceProvider, sync_v7::synchroniser::SynchroniserV7};

use super::{settings::SyncSettings, synchroniser::SynchroniserV5V6, CentralServerConfig};

/// Single dispatch point that picks v5_v6 or v7 sync based on the stored
/// `SyncVersion` setting. Central servers are always v5_v6.
pub enum Synchroniser {
    V5V6(SynchroniserV5V6),
    V7(SynchroniserV7),
}

impl Synchroniser {
    pub fn new(
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
    ) -> anyhow::Result<Self> {
        let ctx = service_provider.basic_context()?;
        let version = SyncVersion::get(&ctx.connection, CentralServerConfig::is_central_server())
            .context("Failed to read sync version from key value store")?;

        Ok(match version {
            SyncVersion::V5V6 => Self::V5V6(SynchroniserV5V6::new(settings, service_provider)?),
            SyncVersion::V7 => Self::V7(SynchroniserV7::new(settings, service_provider)),
        })
    }

    pub async fn sync(&self) -> anyhow::Result<()> {
        match self {
            Synchroniser::V5V6(s) => s.sync().await.map_err(|e| anyhow::anyhow!("{e:?}")),
            Synchroniser::V7(s) => s.sync().await.map_err(|e| anyhow::anyhow!("{e:?}")),
        }
    }
}
