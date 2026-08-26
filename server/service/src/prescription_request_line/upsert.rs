use repository::{
    ItemRow, ItemRowRepository, ItemType, PrescriptionRequestLineRow,
    PrescriptionRequestLineRowRepository, RepositoryError, StorageConnection, TransactionError,
};

use crate::prescription_request::validate::{
    check_prescription_request_editable, CommonPrescriptionRequestError,
};
use crate::service_provider::ServiceContext;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpsertPrescriptionRequestLine {
    pub id: String,
    pub prescription_request_id: String,
    pub item_id: String,
    /// Prescribed quantity in units
    pub quantity: f64,
    /// Directions (abbreviations already expanded client-side)
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpsertPrescriptionRequestLineError {
    PrescriptionRequestDoesNotExist,
    NotThisStorePrescriptionRequest,
    /// Lines are only editable while the request is New.
    NotEditable,
    /// The line exists on a different prescription request.
    LineBelongsToAnotherPrescriptionRequest,
    ItemDoesNotExist,
    NotAStockItem,
    InvalidQuantity,
    DatabaseError(RepositoryError),
}

pub fn upsert_prescription_request_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpsertPrescriptionRequestLine,
) -> Result<PrescriptionRequestLineRow, UpsertPrescriptionRequestLineError> {
    use UpsertPrescriptionRequestLineError::*;

    ctx.connection
        .transaction_sync(|connection| {
            check_prescription_request_editable(connection, store_id, &input.prescription_request_id)
                .map_err(|error| match error {
                CommonPrescriptionRequestError::DoesNotExist => PrescriptionRequestDoesNotExist,
                CommonPrescriptionRequestError::NotThisStorePrescriptionRequest => {
                    NotThisStorePrescriptionRequest
                }
                CommonPrescriptionRequestError::NotEditable => NotEditable,
                CommonPrescriptionRequestError::DatabaseError(e) => DatabaseError(e),
            })?;

            let repo = PrescriptionRequestLineRowRepository::new(connection);
            if let Some(existing_line) = repo.find_one_by_id(&input.id)? {
                if existing_line.prescription_request_id != input.prescription_request_id {
                    return Err(LineBelongsToAnotherPrescriptionRequest);
                }
            }

            check_item(connection, &input.item_id)?;
            if input.quantity <= 0.0 {
                return Err(InvalidQuantity);
            }

            let row = PrescriptionRequestLineRow {
                id: input.id,
                prescription_request_id: input.prescription_request_id,
                item_id: input.item_id,
                quantity: input.quantity,
                note: input.note,
            };
            repo.upsert_one(&row)?;

            Ok(row)
        })
        .map_err(|error: TransactionError<UpsertPrescriptionRequestLineError>| error.to_inner_error())
}

fn check_item(
    connection: &StorageConnection,
    item_id: &str,
) -> Result<ItemRow, UpsertPrescriptionRequestLineError> {
    use UpsertPrescriptionRequestLineError::*;

    let item = ItemRowRepository::new(connection)
        .find_one_by_id(item_id)?
        .ok_or(ItemDoesNotExist)?;
    if item.r#type != ItemType::Stock {
        return Err(NotAStockItem);
    }
    Ok(item)
}

impl From<RepositoryError> for UpsertPrescriptionRequestLineError {
    fn from(error: RepositoryError) -> Self {
        UpsertPrescriptionRequestLineError::DatabaseError(error)
    }
}
