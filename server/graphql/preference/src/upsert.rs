use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::{StorePrefUpdate, UpsertPreferences},
};

#[derive(InputObject)]
pub struct BoolStorePrefInput {
    pub store_id: String,
    pub value: bool,
}
#[derive(InputObject)]
pub struct UpsertPreferencesInput {
    pub show_contact_tracing: Option<bool>,
    pub display_population_based_forecasting: Option<bool>,
    pub display_vaccines_in_doses: Option<Vec<BoolStorePrefInput>>,
    pub manage_vvm_status_for_stock: Option<Vec<BoolStorePrefInput>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<BoolStorePrefInput>>,
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
            display_vaccines_in_doses,
            manage_vvm_status_for_stock,
            sort_by_vvm_status_then_expiry,
            allow_tracking_of_received_stock_by_donor,
        } = self;

        UpsertPreferences {
            show_contact_tracing,
            display_population_based_forecasting,
            allow_tracking_of_received_stock_by_donor,
            display_vaccines_in_doses: display_vaccines_in_doses
                .map(|i| i.into_iter().map(|i| i.to_domain()).collect()),
            manage_vvm_status_for_stock: manage_vvm_status_for_stock
                .map(|i| i.into_iter().map(|i| i.to_domain()).collect()),
            sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry
                .map(|i| i.into_iter().map(|i| i.to_domain()).collect()),
        }
    }
}

impl BoolStorePrefInput {
    pub fn to_domain(self) -> StorePrefUpdate<bool> {
        let BoolStorePrefInput { store_id, value } = self;

        StorePrefUpdate { store_id, value }
    }
}
