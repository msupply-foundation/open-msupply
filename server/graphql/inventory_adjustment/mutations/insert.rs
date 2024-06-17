use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::generic_errors::StockLineReducedBelowZero;
use graphql_types::types::InvoiceNode;
use service::invoice::inventory_adjustment::InsertInventoryAdjustmentError as ServiceError;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::inventory_adjustment::{AdjustmentType, InsertInventoryAdjustment},
};

#[derive(InputObject)]
#[graphql(name = "CreateInventoryAdjustmentInput")]
pub struct CreateInventoryAdjustmentInput {
    pub stock_line_id: String,
    pub adjustment: f64,
    pub adjustment_type: AdjustmentTypeInput,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "CreateInventoryAdjustmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "CreateInventoryAdjustmentResponse")]
pub enum InsertResponse {
    Response(InvoiceNode),
    Error(InsertError),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]

pub enum AdjustmentTypeInput {
    Addition,
    Reduction,
}

pub fn create_inventory_adjustment(
    ctx: &Context<'_>,
    store_id: &str,
    input: CreateInventoryAdjustmentInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInventoryAdjustment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .insert_inventory_adjustment(&service_context, input.to_domain());

    let result = match result {
        Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
        Err(err) => InsertResponse::Error(InsertError {
            error: map_error(err)?,
        }),
    };

    Ok(result)
}

impl CreateInventoryAdjustmentInput {
    pub fn to_domain(self) -> InsertInventoryAdjustment {
        let CreateInventoryAdjustmentInput {
            stock_line_id,
            adjustment,
            adjustment_type,
            inventory_adjustment_reason_id,
        }: CreateInventoryAdjustmentInput = self;

        InsertInventoryAdjustment {
            stock_line_id,
            adjustment,
            adjustment_type: adjustment_type.to_domain(),
            inventory_adjustment_reason_id,
        }
    }
}

#[derive(Interface)]
#[graphql(name = "InsertInventoryAdjustmentErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    StockLineReducedBelowZero(StockLineReducedBelowZero),
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::StockLineReducedBelowZero(line) => {
            return Ok(InsertErrorInterface::StockLineReducedBelowZero(
                StockLineReducedBelowZero::from_domain(line),
            ))
        }

        // Standard Graphql Errors
        ServiceError::StockLineDoesNotExist
        | ServiceError::InvalidStore
        | ServiceError::InvalidAdjustment
        | ServiceError::AdjustmentReasonNotValid
        | ServiceError::AdjustmentReasonNotProvided => BadUserInput(formatted_error),

        ServiceError::NewlyCreatedInvoiceDoesNotExist
        | ServiceError::StockInLineInsertError(_)
        | ServiceError::StockOutLineInsertError(_)
        | ServiceError::InternalError(_)
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl AdjustmentTypeInput {
    pub fn to_domain(&self) -> AdjustmentType {
        match self {
            AdjustmentTypeInput::Addition => AdjustmentType::Addition,
            AdjustmentTypeInput::Reduction => AdjustmentType::Reduction,
        }
    }
}
