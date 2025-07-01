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
    // Global preferences
    pub allow_tracking_of_stock_by_donor: Option<bool>,
    pub show_contact_tracing: Option<bool>,
    // Store preferences
    pub manage_vaccines_in_doses: Option<Vec<BoolStorePrefInput>>,
    pub manage_vvm_status_for_stock: Option<Vec<BoolStorePrefInput>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<BoolStorePrefInput>>,
    pub use_simplified_mobile_ui: Option<Vec<BoolStorePrefInput>>,
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
    pub fn to_domain(&self) -> UpsertPreferences {
        let UpsertPreferencesInput {
            // Global preferences
            allow_tracking_of_stock_by_donor,
            show_contact_tracing,
            // Store preferences
            manage_vaccines_in_doses,
            manage_vvm_status_for_stock,
            sort_by_vvm_status_then_expiry,
            use_simplified_mobile_ui,
        } = self;

        UpsertPreferences {
            // Global preferences
            allow_tracking_of_stock_by_donor: *allow_tracking_of_stock_by_donor,
            show_contact_tracing: *show_contact_tracing,
            // Global preferences*show_contact_tracing
            manage_vaccines_in_doses: manage_vaccines_in_doses
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            manage_vvm_status_for_stock: manage_vvm_status_for_stock
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            use_simplified_mobile_ui: use_simplified_mobile_ui
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
        }
    }
}

impl BoolStorePrefInput {
    pub fn to_domain(&self) -> StorePrefUpdate<bool> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value,
        }
    }
}
