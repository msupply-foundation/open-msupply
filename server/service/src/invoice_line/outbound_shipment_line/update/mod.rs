use crate::{u32_to_i32, WithDBError};
use domain::outbound_shipment::UpdateOutboundShipmentLine;
use repository::{
    schema::{InvoiceLineRow, StockLineRow},
    InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_outbound_shipment_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateOutboundShipmentLine,
) -> Result<String, UpdateOutboundShipmentLineError> {
    let connection = connection_manager.connection()?;
    let new_line = connection
        .transaction_sync(|connection| {
            let (line, item, batch_pair, invoice) = validate(&input, &connection)?;

            let (new_line, batch_pair) = generate(input, line, item, batch_pair, invoice)?;
            InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;

            let stock_line_repo = StockLineRepository::new(&connection);
            stock_line_repo.upsert_one(&batch_pair.main_batch)?;
            if let Some(previous_batch) = batch_pair.previous_batch_option {
                stock_line_repo.upsert_one(&previous_batch)?;
            }
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<UpdateOutboundShipmentLineError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}
/// During outbound shipment line update, stock line may change thus validation and updates need to apply to both batches
pub struct BatchPair {
    /// Main batch to be updated
    pub main_batch: StockLineRow,
    /// Optional previous batch (if batch was changed)
    pub previous_batch_option: Option<StockLineRow>,
}

impl BatchPair {
    /// Calculate reduction amount to apply to main batch
    pub fn get_main_batch_reduction(
        &self,
        input: &UpdateOutboundShipmentLine,
        existing_line: &InvoiceLineRow,
    ) -> i32 {
        // Previous batch exists, this mean new batch was requested means:
        // - reduction should be number of packs from input (or existing line if number of pack is missing in input)
        if self.previous_batch_option.is_some() {
            input
                .number_of_packs
                .map(u32_to_i32)
                .unwrap_or(existing_line.number_of_packs)
        } else {
            // Previous batch does not exists, this mean updating existing batch, thus:
            // - reduction is the difference between input and existing line number of packs
            if let Some(number_of_packs) = &input.number_of_packs {
                u32_to_i32(*number_of_packs) - existing_line.number_of_packs
            } else {
                // No changes in input, no reduction
                0
            }
        }
    }
}

pub enum UpdateOutboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    NotThisInvoiceLine(String),
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    ItemDoesNotMatchStockLine,
    LineDoesNotReferenceStockLine,
    BatchIsOnHold,
    StockLineAlreadyExistsInInvoice(String),
    ReductionBelowZero {
        stock_line_id: String,
        line_id: String,
    },
}

impl From<RepositoryError> for UpdateOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateOutboundShipmentLineError
where
    ERR: Into<UpdateOutboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
