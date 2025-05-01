use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::UpsertPreferences,
};

#[derive(InputObject)]
pub struct UpsertPreferencesInput {
    pub show_contact_tracing: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    pub allow_tracking_of_received_stock_by_donor: Option<bool>,
}

pub fn upsert_preferences(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertPreferencesInput,
) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePreferences,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    service_provider
        .preference_service
        .upsert(&service_context, input.to_domain())?;

    Ok(())
}

impl UpsertPreferencesInput {
    pub fn to_domain(self) -> UpsertPreferences {
        let UpsertPreferencesInput {
            show_contact_tracing,
            display_population_based_forecasting,
            allow_tracking_of_received_stock_by_donor,
        } = self;

        UpsertPreferences {
            show_contact_tracing,
            display_population_based_forecasting,
            allow_tracking_of_received_stock_by_donor,
        }
    }
}
