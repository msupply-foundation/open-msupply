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
    pub item_id_or_code: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub price_per_pack_before_discount: Option<f64>,
    pub price_per_pack_after_discount: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub note: Option<String>,
    pub unit: Option<String>,
    pub supplier_item_code: Option<String>,
    pub comment: Option<String>,
}

pub fn insert_purchase_order_line(
    ctx: &ServiceContext,
    input: InsertPurchaseOrderLineInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            let item = validate(&ctx.store_id.clone(), &input, connection)?;
            let purchase_order_line = generate(connection, &ctx.store_id.clone(), item, input)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PurchaseOrderLineCreated,
                Some(purchase_order_line.purchase_order_id.clone()),
                None,
                None,
            )?;

            PurchaseOrderLineRowRepository::new(connection).upsert_one(&purchase_order_line)?;
            Ok(purchase_order_line)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderLineError>| error.to_inner_error())?;

    Ok(purchase_order_line)
}

impl From<RepositoryError> for InsertPurchaseOrderLineError {
    fn from(error: RepositoryError) -> Self {
        InsertPurchaseOrderLineError::DatabaseError(error)
    }
}
