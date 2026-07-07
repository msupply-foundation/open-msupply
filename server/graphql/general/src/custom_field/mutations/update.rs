use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{
    CustomFieldConnector, CustomFieldNodeDisplayMode, CustomFieldsResponse,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    custom_field::{
        CustomFieldScopeUpdate, UpdateCustomFieldScopes, UpdateCustomFieldScopesError as ServiceError,
    },
    ListResult,
};

#[derive(InputObject)]
pub struct UpdateCustomFieldScopesInput {
    /// The scope being configured, e.g. `"item"` or `"inbound_shipment"`.
    pub scope: String,
    pub updates: Vec<UpdateCustomFieldScopeInput>,
}

#[derive(InputObject)]
pub struct UpdateCustomFieldScopeInput {
    pub custom_field_id: String,
    pub display_mode: CustomFieldNodeDisplayMode,
}

pub fn update_custom_field_scopes(
    ctx: &Context<'_>,
    input: UpdateCustomFieldScopesInput,
) -> Result<CustomFieldsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateCustomFieldConfig,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .custom_field_service
        .update_custom_field_scopes(&service_context, input.to_domain())
        .map_err(map_error)?;

    Ok(CustomFieldsResponse::Response(
        CustomFieldConnector::from_domain(ListResult {
            count: result.len() as u32,
            rows: result,
        }),
    ))
}

impl UpdateCustomFieldScopesInput {
    fn to_domain(self) -> UpdateCustomFieldScopes {
        UpdateCustomFieldScopes {
            scope: self.scope,
            updates: self
                .updates
                .into_iter()
                .map(|u| CustomFieldScopeUpdate {
                    custom_field_id: u.custom_field_id,
                    display_mode: u.display_mode.to_domain(),
                })
                .collect(),
        }
    }
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::ScopeRowDoesNotExist(_) => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}
