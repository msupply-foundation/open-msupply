pub use async_graphql::*;
use async_graphql::{Context, Enum};
use graphql_core::ContextExt;
use service::sync::sync_status::status::InitialisationStatus;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum InitialisationStatusType {
    /// Fuly initialised
    Initialised,
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub(crate) fn initialisation_status(ctx: &Context<'_>) -> Result<InitialisationStatusType> {
    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let initialisation_status = service_provider
        .sync_status_service
        .get_initialisation_status(&ctx)?;

    Ok(InitialisationStatusType::from_domain(
        &initialisation_status,
    ))
}

impl InitialisationStatusType {
    pub(crate) fn from_domain(
        initialisation_status: &InitialisationStatus,
    ) -> InitialisationStatusType {
        use InitialisationStatus as from;
        use InitialisationStatusType as to;
        match initialisation_status {
            from::Initialised => to::Initialised,
            from::Initialising => to::Initialising,
            from::PreInitialisation => to::PreInitialisation,
        }
    }
}
