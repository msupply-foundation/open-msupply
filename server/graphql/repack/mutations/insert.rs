use async_graphql::*;
use graphql_core::{
    simple_generic_errors::CannotHaveFractionalPack,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::{generic_errors::StockLineReducedBelowZero, types::InvoiceNode};
use repository::Invoice;
use service::{
    auth::{Resource, ResourceAccessRequest},
    repack::{InsertRepack as ServiceInput, InsertRepackError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "InsertRepackInput")]
pub struct InsertRepackInput {
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub new_pack_size: f64,
    pub new_location_id: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "InsertRepackErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    StockLineReducedBelowZero(StockLineReducedBelowZero),
    CannotHaveFractionalPack(CannotHaveFractionalPack),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRepackError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRepackResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert_repack(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertRepackInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::CreateRepack,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .repack_service
            .insert_repack(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl InsertRepackInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertRepackInput {
            stock_line_id,
            number_of_packs,
            new_pack_size,
            new_location_id,
        } = self;

        ServiceInput {
            stock_line_id,
            number_of_packs,
            new_pack_size,
            new_location_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::StockLineReducedBelowZero(line) => {
            return Ok(InsertErrorInterface::StockLineReducedBelowZero(
                StockLineReducedBelowZero::from_domain(line),
            ))
        }
        ServiceError::CannotHaveFractionalPack => {
            return Ok(InsertErrorInterface::CannotHaveFractionalPack(
                CannotHaveFractionalPack {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::StockLineDoesNotExist => BadUserInput(formatted_error),
        ServiceError::NotThisStoreStockLine => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InternalError(err) => InternalError(err),
    };

    Err(graphql_error.extend())
}
