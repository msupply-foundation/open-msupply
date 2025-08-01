use crate::service_provider::ServiceContext;
use repository::{
    ItemRowRepository, PurchaseOrderLineRow, PurchaseOrderLineRowRepository, RepositoryError,
    TransactionError,
};

mod generate;
use generate::{generate, generate_from_csv, GenerateFromCSVInput};
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
    PackSizeCodeCombinationExists(PackSizeCodeCombination),
    DatabaseError(RepositoryError),
    CannotFindItemByCode(String),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertPurchaseOrderLineInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
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
                // TODO amend default value if we extend standard insert line input
                requested_pack_size: 0.0, // Default value
            };
            validate(&ctx.store_id.clone(), &validate_input, connection)?;

            let new_purchase_order_line =
                generate(connection, &ctx.store_id.clone(), input.clone())?;
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
    pub id: String,
    pub purchase_order_id: String,
    pub item_code: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
}

pub fn insert_purchase_order_line_from_csv(
    ctx: &ServiceContext,
    input: InsertPurchaseOrderLineFromCSVInput,
) -> Result<PurchaseOrderLineRow, InsertPurchaseOrderLineError> {
    let purchase_order_line = ctx
        .connection
        .transaction_sync(|connection| {
            // first validate that we can find the item
            let item_option =
                ItemRowRepository::new(connection).find_one_by_code(&input.item_code)?;

            let item = match item_option {
                Some(item) => item,
                None => {
                    return Err(InsertPurchaseOrderLineError::CannotFindItemByCode(
                        input.item_code.clone(),
                    ));
                }
            };

            let validate_input = validate::ValidateInput {
                id: input.id.clone(),
                purchase_order_id: input.purchase_order_id.clone(),
                item_id: item.id.clone(),
                requested_pack_size: input.requested_pack_size.unwrap_or(0.0), // Default value which can be edited in UI
            };

            validate(&ctx.store_id.clone(), &validate_input, connection)?;

            let generate_input = GenerateFromCSVInput {
                id: input.id,
                purchase_order_id: input.purchase_order_id,
                item_id: item.id,
                requested_pack_size: input.requested_pack_size,
                requested_number_of_units: input.requested_number_of_units,
            };

            let new_purchase_order_line =
                generate_from_csv(connection, &ctx.store_id.clone(), generate_input)?;

            PurchaseOrderLineRowRepository::new(connection).upsert_one(&new_purchase_order_line)?;

            Ok(new_purchase_order_line)
        })
        .map_err(|error: TransactionError<InsertPurchaseOrderLineError>| error.to_inner_error())?;

    Ok(purchase_order_line)
}
