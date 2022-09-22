pub use async_graphql::*;
use async_graphql::{Context, Enum};
use graphql_core::ContextExt;
use service::sync::sync_status::status::SyncState;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum SyncStateType {
    /// Fuly initialised
    Initialised,
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub(crate) fn sync_state(ctx: &Context<'_>) -> Result<SyncStateType> {
    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let sync_state = service_provider.sync_status_service.get_sync_state(&ctx)?;

    Ok(SyncStateType::from_domain(&sync_state))
}

impl SyncStateType {
    pub(crate) fn from_domain(sync_state: &SyncState) -> SyncStateType {
        use SyncState as from;
        use SyncStateType as to;
        match sync_state {
            from::Initialised => to::Initialised,
            from::Initialising => to::Initialising,
            from::PreInitialisation => to::PreInitialisation,
        }
    }
}
