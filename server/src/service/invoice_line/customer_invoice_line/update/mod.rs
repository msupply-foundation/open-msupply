use crate::{
    database::{
        repository::{
            InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        },
        schema::{InvoiceLineRow, StockLineRow},
    },
    domain::customer_invoice::UpdateCustomerInvoiceLine,
    service::{u32_to_i32, WithDBError},
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_customer_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateCustomerInvoiceLine,
) -> Result<String, UpdateCustomerInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let (line, item, batch_pair, invoice) = validate(&input, &connection)?;

    let (new_line, batch_pair) = generate(input, line, item, batch_pair, invoice)?;
    InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;

    let stock_line_repo = StockLineRepository::new(&connection);
    stock_line_repo.upsert_one(&batch_pair.main_batch)?;
    if let Some(previous_batch) = batch_pair.previous_batch_option {
        stock_line_repo.upsert_one(&previous_batch)?;
    }

    Ok(new_line.id)
}
/// During customer invoice line update, stock line may change thus validation and updates need to apply to both batches
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
        input: &UpdateCustomerInvoiceLine,
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

pub enum UpdateCustomerInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotACustomerInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    ItemDoesNotMatchStockLine,
    LineDoesntReferenceStockLine,
    StockLineAlreadyExistsInInvoice(String),
    ReductionBelowZero(String),
}

impl From<RepositoryError> for UpdateCustomerInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateCustomerInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateCustomerInvoiceLineError
where
    ERR: Into<UpdateCustomerInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
