use async_graphql::*;
use graphql_types::types::CustomFieldsResponse;

mod mutations;
mod query;
use self::mutations::*;
use self::query::*;

#[derive(Default, Clone)]
pub struct CustomFieldConfigQueries;

#[Object]
impl CustomFieldConfigQueries {
    /// Admin/config read of a scope's custom fields, **including `HIDDEN`**
    /// ones — unlike the display `customFields` query, which filters hidden
    /// fields out. Drives the "Configure property visibility" admin page.
    /// Central-server only.
    pub async fn custom_field_scope_config(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Scope to configure, e.g. \"item\" or \"inbound_shipment\"")]
        scope: String,
    ) -> Result<CustomFieldsResponse> {
        custom_field_scope_config(ctx, scope)
    }
}

#[derive(Default, Clone)]
pub struct CustomFieldMutations;

#[Object]
impl CustomFieldMutations {
    /// Update the display mode (HIDDEN / VISIBLE / PROMINENT) of custom fields
    /// on a single scope. Only updates existing scope mappings (every
    /// field/scope pair is seeded from sync). Central-server only.
    async fn update_scopes(
        &self,
        ctx: &Context<'_>,
        input: UpdateCustomFieldScopesInput,
    ) -> Result<CustomFieldsResponse> {
        update_custom_field_scopes(ctx, input)
    }
}
