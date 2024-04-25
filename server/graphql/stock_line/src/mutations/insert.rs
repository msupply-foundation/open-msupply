use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::StockLineNode;
use repository::StockLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::inventory_adjustment::add_new_stock_line::{AddNewStockLine, AddNewStockLineError},
    NullableUpdate,
};

#[derive(InputObject)]
#[graphql(name = "InsertStockLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub number_of_packs: f64,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub pack_size: u32,
    pub on_hold: bool,
    pub batch: Option<String>,
    pub location: Option<NullableUpdateInput<String>>,
    pub expiry_date: Option<NaiveDate>,
    pub inventory_adjustment_reason_id: Option<String>,
    /// Empty barcode will unlink barcode from StockLine
    pub barcode: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "InsertStockLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    RecordNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertStockLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertStockLineLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(StockLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInventoryAdjustment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .invoice_service
            .add_new_stock_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<StockLine, AddNewStockLineError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(stock_line) => InsertResponse::Response(StockLineNode::from_domain(stock_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl InsertInput {
    pub fn to_domain(self) -> AddNewStockLine {
        let InsertInput {
            id,
            location,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_id,
            number_of_packs,
            pack_size,
            inventory_adjustment_reason_id,
        } = self;

        AddNewStockLine {
            stock_line_id: id,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            batch,
            on_hold,
            barcode,
            item_id,
            number_of_packs,
            pack_size,
            inventory_adjustment_reason_id,
        }
    }
}

fn map_error(error: AddNewStockLineError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        AddNewStockLineError::InvalidStore
        | AddNewStockLineError::AdjustmentReasonNotValid
        | AddNewStockLineError::AdjustmentReasonNotProvided
        | AddNewStockLineError::StockLineAlreadyExists => BadUserInput(formatted_error),
        AddNewStockLineError::NewlyCreatedStockLineDoesNotExist
        | AddNewStockLineError::LineInsertError(_)
        | AddNewStockLineError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

// TODO: tests
