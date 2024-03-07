use async_graphql::Enum;
pub use async_graphql::*;
use graphql_core::ContextExt;
use service::sync::sync_status::status::InitialisationStatus;

#[derive(SimpleObject)]
pub struct InitialisationStatusNode {
    status: InitialisationStatusType,
    site_name: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum InitialisationStatusType {
    /// Fuly initialised
    Initialised,
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub(crate) fn initialisation_status(ctx: &Context<'_>) -> Result<InitialisationStatusNode> {
    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let initialisation_status = service_provider
        .sync_status_service
        .get_initialisation_status(&ctx)?;

    Ok(InitialisationStatusNode::from_domain(initialisation_status))
}

impl InitialisationStatusNode {
    pub(crate) fn from_domain(
        initialisation_status: InitialisationStatus,
    ) -> InitialisationStatusNode {
        use InitialisationStatus as from;
        use InitialisationStatusType as to;
        let status = match initialisation_status {
            from::Initialised(site_name) => {
                return InitialisationStatusNode {
                    site_name: Some(site_name),
                    status: to::Initialised,
                }
            }
            from::Initialising => to::Initialising,
            from::PreInitialisation => to::PreInitialisation,
        };

        InitialisationStatusNode {
            status,
            site_name: None,
        }
    }
}
