use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::SupplierReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::invoice::supplier_return::generate_supplier_return_lines::GenerateSupplierReturnLinesInput as ServiceInput;

#[derive(InputObject, Clone)]
/// At least one input is required.
pub struct GenerateSupplierReturnLinesInput {
    /// The stock line ids to generate new return lines for
    pub stock_line_ids: Vec<String>,
    /// Generate new return lines for all the available stock lines of a specific item
    pub item_id: Option<String>,
    /// Include existing return lines in the response. Only has an effect when either `stock_line_ids` or `item_id` is set.
    pub return_id: Option<String>,
}

#[derive(Union)]
pub enum GenerateSupplierReturnLinesResponse {
    Response(SupplierReturnLineConnector),
}

pub async fn generate_supplier_return_lines(
    ctx: &Context<'_>,
    store_id: String,
    input: GenerateSupplierReturnLinesInput,
) -> Result<GenerateSupplierReturnLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSupplierReturn,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let domain_input = input.to_domain();

    let return_lines = tokio::task::spawn_blocking(move || -> Result<_, service::ListError> {
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;
        service_provider.invoice_service.generate_supplier_return_lines(
            &service_context,
            &store_id,
            domain_input,
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateSupplierReturnLinesResponse::Response(
        SupplierReturnLineConnector::from_domain(return_lines),
    ))
}

impl GenerateSupplierReturnLinesInput {
    fn to_domain(self) -> ServiceInput {
        let GenerateSupplierReturnLinesInput {
            stock_line_ids,
            item_id,
            return_id,
        } = self;

        ServiceInput {
            stock_line_ids,
            item_id,
            return_id,
        }
    }
}
