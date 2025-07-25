use crate::invoice::common::check_master_list_for_store;
use crate::purchase_order::common::get_lines_for_purchase_order;
use crate::purchase_order::generate::generate_empty_purchase_order_lines;
use crate::purchase_order::validate::check_purchase_order_exists;
use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, ItemType, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineRepository,
    PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderRow, PurchaseOrderStatus,
};
use repository::{
    MasterListLineFilter, MasterListLineRepository, RepositoryError, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub struct AddToPurchaseOrderFromMasterListInput {
    pub purchase_order_id: String,
    pub master_list_id: String,
}

#[derive(Debug, PartialEq)]
pub enum AddToPurchaseOrderFromMasterListError {
    ShipmentDoesNotExist,
    NotThisStorePurchaseOrder,
    CannotEditPurchaseOrder,
    MasterListNotFoundForThisStore,
    NotAPurchaseOrder,
    DatabaseError(RepositoryError),
}

type InError = AddToPurchaseOrderFromMasterListError;

impl From<RepositoryError> for AddToPurchaseOrderFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        AddToPurchaseOrderFromMasterListError::DatabaseError(error)
    }
}

pub fn add_from_master_list(
    ctx: &ServiceContext,
    input: AddToPurchaseOrderFromMasterListInput,
) -> Result<Vec<PurchaseOrderLine>, InError> {
    let purchase_order_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let purchase_order_row = validate(connection, &ctx.store_id, &input)?;
            let new_purchase_order_line_rows = generate(ctx, purchase_order_row, &input)?;

            let purchase_order_line_row_repository =
                PurchaseOrderLineRowRepository::new(connection);

            for purchase_order_line_row in new_purchase_order_line_rows {
                purchase_order_line_row_repository.upsert_one(&purchase_order_line_row)?;
            }

            match PurchaseOrderLineRepository::new(connection).query_by_filter(
                PurchaseOrderLineFilter::new()
                    .purchase_order_id(EqualFilter::equal_to(&input.purchase_order_id)),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(InError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(purchase_order_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &AddToPurchaseOrderFromMasterListInput,
) -> Result<PurchaseOrderRow, InError> {
    let purchase_order_row = check_purchase_order_exists(&input.purchase_order_id, connection)?
        .ok_or(InError::ShipmentDoesNotExist)?;

    if purchase_order_row.store_id != store_id {
        return Err(InError::NotThisStorePurchaseOrder);
    }

    if purchase_order_row.status == PurchaseOrderStatus::Confirmed {
        return Err(InError::CannotEditPurchaseOrder);
    }

    check_master_list_for_store(
        connection,
        &purchase_order_row.store_id,
        &input.master_list_id,
    )?
    .ok_or(InError::MasterListNotFoundForThisStore)?;

    Ok(purchase_order_row)
}

fn generate(
    ctx: &ServiceContext,
    purchase_order_row: PurchaseOrderRow,
    input: &AddToPurchaseOrderFromMasterListInput,
) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
    let purchase_order_lines =
        get_lines_for_purchase_order(&ctx.connection, &input.purchase_order_id)?;

    let item_ids_in_purchase_order: Vec<String> = purchase_order_lines
        .into_iter()
        .map(|invoice_line| invoice_line.item_row.id)
        .collect();

    let master_list_lines_not_in_invoice = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&input.master_list_id))
                .item_id(EqualFilter::not_equal_all(item_ids_in_purchase_order))
                .item_type(ItemType::Stock.equal_to()),
        )?;

    let items_ids_not_in_invoice: Vec<String> = master_list_lines_not_in_invoice
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    generate_empty_purchase_order_lines(ctx, &purchase_order_row, items_ids_not_in_invoice)
}
