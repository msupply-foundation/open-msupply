use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice_line::stock_out_line::{
        SetPrescribedQuantity as ServiceInput, SetPrescribedQuantityError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "SetPrescribedQuantityInput")]
pub struct SetPrescribedQuantityInput {
    pub invoice_id: String,
    pub item_id: String,
    pub prescribed_quantity: f64,
}

impl SetPrescribedQuantityInput {
    pub fn to_domain(self) -> ServiceInput {
        let SetPrescribedQuantityInput {
            invoice_id,
            item_id,
            prescribed_quantity,
        } = self;

        ServiceInput {
            invoice_id,
            item_id,
            prescribed_quantity,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "SetPrescribedQuantityError")]
pub struct SetPrescribedQuantityError {
    pub error: SetPrescribedQuantityErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "SetPrescribedQuantityErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum SetPrescribedQuantityErrorInterface {
    ForeignKeyError(ForeignKeyError),
}

#[derive(Union)]
#[graphql(name = "SetPrescribedQuantityResponse")]
pub enum SetPrescribedQuantityResponse {
    Error(SetPrescribedQuantityError),
    Response(InvoiceLineNode),
}

pub async fn set_prescribed_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: SetPrescribedQuantityInput,
) -> Result<SetPrescribedQuantityResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let store_id = store_id.to_string();
    let domain_input = input.to_domain();

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        Ok(service_provider
            .invoice_line_service
            .set_prescribed_quantity(&service_context, domain_input))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    map_response(result)
}

pub fn map_response(
    from: Result<InvoiceLine, ServiceError>,
) -> Result<SetPrescribedQuantityResponse> {
    let result = match from {
        Ok(invoice_line) => {
            SetPrescribedQuantityResponse::Response(InvoiceLineNode::from_domain(invoice_line))
        }
        Err(error) => SetPrescribedQuantityResponse::Error(SetPrescribedQuantityError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<SetPrescribedQuantityErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(SetPrescribedQuantityErrorInterface::ForeignKeyError(
                ForeignKeyError(ForeignKey::InvoiceId),
            ))
        }
        // Standard Graphql Errors
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAStockItem => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAPrescription => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
