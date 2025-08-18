use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};
use chrono::NaiveDate;
use repository::{
    ActivityLogType, PurchaseOrderLineRow, PurchaseOrderLineRowRepository, RepositoryError,
    TransactionError,
};
use util::uuid;

mod generate;
use generate::{generate, generate_from_csv};
mod validate;
use validate::validate;
mod test;

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
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderLineInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub price_per_unit_before_discount: Option<f64>,
    pub price_per_unit_after_discount: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub note: Option<String>,
    pub unit_of_packs: Option<String>,
    pub supplier_item_code: Option<String>,
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
                item_id: Some(input.item_id.clone()),
                item_code: None,
                // TODO amend default value if we extend standard insert line input
                requested_pack_size: input.requested_pack_size.unwrap_or_default(), // Default value
                manufacturer_id: input.manufacturer_id.clone(),
            };
            validate(&ctx.store_id.clone(), &validate_input, connection)?;
            let new_purchase_order_line =
                generate(connection, &ctx.store_id.clone(), input.clone())?;

            activity_log_entry(
                ctx,
                ActivityLogType::PurchaseOrderLineCreated,
                Some(new_purchase_order_line.purchase_order_id.clone()),
                None,
                None,
            )?;
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

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderLineFromCSVInput {
    pub purchase_order_id: String,
    pub item_code: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub price_per_unit_before_discount: Option<f64>,
    pub price_per_unit_after_discount: Option<f64>,
}

pub fn insert_purchase_order_line_from_csv(
    ctx: &ServiceContext,
    input: InsertPurchaseOrderLineFromCSVInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            // first validate that we can find the item

            let id = uuid::uuid();
            let validate_input = validate::ValidateInput {
                id: id.clone(),
                purchase_order_id: input.purchase_order_id.clone(),
                item_id: None,
                item_code: Some(input.item_code.clone()),
                requested_pack_size: input.requested_pack_size.unwrap_or(0.0), // Default value which can be edited in UI
                manufacturer_id: None,
            };

            let item = validate(&ctx.store_id.clone(), &validate_input, connection)?;

            let generate_input = InsertPurchaseOrderLineInput {
                id,
                purchase_order_id: input.purchase_order_id,
                item_id: item.id,
                requested_pack_size: input.requested_pack_size,
                requested_number_of_units: input.requested_number_of_units,
                price_per_unit_before_discount: input.price_per_unit_before_discount,
                price_per_unit_after_discount: input.price_per_unit_after_discount,
                unit_of_packs: None,
                requested_delivery_date: None,
                expected_delivery_date: None,
                manufacturer_id: None,
                note: None,
                supplier_item_code: None,
            };

            let new_purchase_order_line =
                generate_from_csv(connection, &ctx.store_id.clone(), generate_input)?;

            PurchaseOrderLineRowRepository::new(connection).upsert_one(&new_purchase_order_line)?;

            Ok(new_purchase_order_line)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderLineError>| error.to_inner_error())?;

    Ok(purchase_order_line)
}
