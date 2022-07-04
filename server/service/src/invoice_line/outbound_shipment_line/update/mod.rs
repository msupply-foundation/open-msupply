use crate::{
    invoice_line::query::get_invoice_line, service_provider::ServiceContext, u32_to_i32,
    WithDBError,
};
use repository::{
    InvoiceLine, InvoiceLineRow, InvoiceLineRowRepository, RepositoryError, StockLineRow,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipmentLine {
    pub id: String,
    pub item_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub number_of_packs: Option<u32>,
    pub total_before_tax: Option<f64>,
    pub tax: Option<f64>,
}

type OutError = UpdateOutboundShipmentLineError;

pub fn update_outbound_shipment_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: UpdateOutboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, batch_pair, invoice) = validate(&input, &connection)?;

            let (update_line, batch_pair) = generate(input, line, item, batch_pair, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&update_line)?;

            let stock_line_repo = StockLineRowRepository::new(&connection);
            stock_line_repo.upsert_one(&batch_pair.main_batch)?;
            if let Some(previous_batch) = batch_pair.previous_batch_option {
                stock_line_repo.upsert_one(&previous_batch)?;
            }

            get_invoice_line(ctx, &update_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(updated_line)
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

#[derive(Clone, Debug, PartialEq)]
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
    LocationIsOnHold,
    LocationNotFound,
    LineDoesNotReferenceStockLine,
    BatchIsOnHold,
    UpdatedLineDoesNotExist,
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
