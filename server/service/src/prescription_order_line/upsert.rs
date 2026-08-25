use repository::{
    ItemRow, ItemRowRepository, ItemType, PrescriptionOrderLineRow,
    PrescriptionOrderLineRowRepository, RepositoryError, StorageConnection, TransactionError,
};

use crate::prescription_order::validate::{
    check_prescription_order_editable, CommonPrescriptionOrderError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpsertPrescriptionOrderLine {
    pub id: String,
    pub prescription_order_id: String,
    pub item_id: String,
    /// Prescribed quantity in units
    pub quantity: f64,
    /// Directions (abbreviations already expanded client-side)
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpsertPrescriptionOrderLineError {
    PrescriptionOrderDoesNotExist,
    NotThisStorePrescriptionOrder,
    /// Lines are only editable while the order is New.
    NotEditable,
    /// The line exists on a different prescription order.
    LineBelongsToAnotherPrescriptionOrder,
    ItemDoesNotExist,
    NotAStockItem,
    InvalidQuantity,
    DatabaseError(RepositoryError),
}

pub fn upsert_prescription_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpsertPrescriptionOrderLine,
) -> Result<PrescriptionOrderLineRow, UpsertPrescriptionOrderLineError> {
    use UpsertPrescriptionOrderLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            check_prescription_order_editable(connection, store_id, &input.prescription_order_id)
                .map_err(|error| match error {
                CommonPrescriptionOrderError::DoesNotExist => PrescriptionOrderDoesNotExist,
                CommonPrescriptionOrderError::NotThisStorePrescriptionOrder => {
                    NotThisStorePrescriptionOrder
                }
                CommonPrescriptionOrderError::NotEditable => NotEditable,
                CommonPrescriptionOrderError::DatabaseError(e) => DatabaseError(e),
            })?;

            let repo = PrescriptionOrderLineRowRepository::new(connection);
            if let Some(existing_line) = repo.find_one_by_id(&input.id)? {
                if existing_line.prescription_order_id != input.prescription_order_id {
                    return Err(LineBelongsToAnotherPrescriptionOrder);
                }
            }

            check_item(connection, &input.item_id)?;
            if input.quantity <= 0.0 {
                return Err(InvalidQuantity);
            }

            let row = PrescriptionOrderLineRow {
                id: input.id,
                prescription_order_id: input.prescription_order_id,
                item_id: input.item_id,
                quantity: input.quantity,
                note: input.note,
            };
            repo.upsert_one(&row)?;

            Ok(row)
        })
        .map_err(|error: TransactionError<UpsertPrescriptionOrderLineError>| error.to_inner_error())
}

fn check_item(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<ItemRow, UpsertPrescriptionOrderLineError> {
    use UpsertPrescriptionOrderLineError::*;

    let item = ItemRowRepository::new(connection)
        .find_one_by_id(item_id)?
        .ok_or(ItemDoesNotExist)?;
    if item.r#type != ItemType::Stock {
        return Err(NotAStockItem);
    }
    Ok(item)
}

impl From<RepositoryError> for UpsertPrescriptionOrderLineError {
    fn from(error: RepositoryError) -> Self {
        UpsertPrescriptionOrderLineError::DatabaseError(error)
    }
}
