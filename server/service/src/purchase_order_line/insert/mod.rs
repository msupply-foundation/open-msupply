use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLineRow, PurchaseOrderLineRowRepository, RepositoryError,
    TransactionError,
};

mod generate;
use generate::generate;
mod validate;
use validate::validate;
mod test;

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum InsertMode {
    Standard,
    CSV,
}

impl Default for InsertMode {
    fn default() -> Self {
        InsertMode::Standard
    }
}

#[derive(Debug, PartialEq)]
pub struct PackSizeCodeCombination {
    pub item_code: String,
    pub requested_pack_size: f64,
}

#[derive(PartialEq, Debug)]
pub enum InsertPurchaseOrderLineError {
    PurchaseOrderLineAlreadyExists,
    ItemDoesNotExist,
    PurchaseOrderDoesNotExist,
    IncorrectStoreId,
    CannotEditPurchaseOrder,
    OtherPartyDoesNotExist,
    OtherPartyNotAManufacturer,
    OtherPartyNotVisible,
    PackSizeCodeCombinationExists(PackSizeCodeCombination),
    DatabaseError(RepositoryError),
    CannotFindItemByCode(String),
    ItemCannotBeOrdered,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderLineInput {
    pub id: String,
    pub purchase_order_id: String,
    // Standard mode uses item_id look up
    pub item_id: Option<String>,
    // CSV mode uses item_code lookup
    pub item_code: Option<String>,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub price_per_unit_before_discount: Option<f64>,
    pub price_per_unit_after_discount: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub note: Option<String>,
    pub unit: Option<String>,
    pub supplier_item_code: Option<String>,
    pub comment: Option<String>,
    pub mode: InsertMode,
}

pub fn insert_purchase_order_line(
    ctx: &ServiceContext,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            let validate_input = validate::ValidateInput {
                id: input.id.clone(),
                purchase_order_id: input.purchase_order_id.clone(),
                item_id: input.item_id.clone(),
                item_code: input.item_code.clone(),
                requested_pack_size: input.requested_pack_size.unwrap_or_default(),
                manufacturer_id: input.manufacturer_id.clone(),
            };
            let item = validate(&ctx.store_id.clone(), &validate_input, connection)?;

            let generate_input = InsertPurchaseOrderLineInput {
                item_id: Some(item.id.clone()),
                item_code: None,
                ..input
            };

            let new_purchase_order_line =
                generate(connection, &ctx.store_id.clone(), item, generate_input)?;

            // Only log activity for standard mode (not CSV bulk imports)
            if input.mode != InsertMode::CSV {
                activity_log_entry(
                    ctx,
                    ActivityLogType::PurchaseOrderLineCreated,
                    Some(new_purchase_order_line.purchase_order_id.clone()),
                    None,
                    None,
                )?;
            }

            PurchaseOrderLineRowRepository::new(connection).upsert_one(&new_purchase_order_line)?;

            Ok(new_purchase_order_line)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderLineError>| error.to_inner_error())?;

    Ok(purchase_order_line)
}

impl From<RepositoryError> for InsertPurchaseOrderLineError {
    fn from(error: RepositoryError) -> Self {
        InsertPurchaseOrderLineError::DatabaseError(error)
    }
}
