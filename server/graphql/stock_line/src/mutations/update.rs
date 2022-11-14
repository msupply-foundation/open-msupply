use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::StockLineNode;
use repository::StockLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stock_line::{UpdateStockLine as ServiceInput, UpdateStockLineError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "UpdateStockLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub location_id: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "UpdateStockLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateStockLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateStockLineLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(StockLineNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .stock_line_service
            .update_stock_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<StockLine, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(requisition_line) => {
            UpdateResponse::Response(StockLineNode::from_domain(requisition_line))
        }
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            location_id,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
        } = self;

        ServiceInput {
            id,
            location_id,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::StockDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        // Standard Graphql Errors
        ServiceError::StockDoesNotBelongToStore => BadUserInput(formatted_error),
        ServiceError::StockIsOnHold => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotExist => BadUserInput(formatted_error),
        ServiceError::UpdatedStockNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
