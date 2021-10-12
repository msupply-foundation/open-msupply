pub mod delete;
pub mod insert;
pub mod update;
use uuid::Uuid;

use crate::{
    database::{
        repository::{
            InvoiceLineRepository, ItemRepository, RepositoryError, StockLineRepository,
            StorageConnection,
        },
        schema::{InvoiceLineRow, InvoiceRow, ItemRow, StockLineRow},
    },
    service::invoice::current_store_id,
};

pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;

pub enum CommonError {
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    ItemNotFound,
    DatabaseError(RepositoryError),
}

fn check_pack_size(pack_size_option: Option<u32>) -> Result<(), CommonError> {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1 {
            Err(CommonError::PackSizeBelowOne)
        } else {
            Ok(())
        }
    } else {
        Ok(())
    }
}

fn check_number_of_packs(number_of_packs_option: Option<u32>) -> Result<(), CommonError> {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs < 1 {
            Err(CommonError::NumberOfPacksBelowOne)
        } else {
            Ok(())
        }
    } else {
        Ok(())
    }
}

fn check_item(item_id: &str, connection: &StorageConnection) -> Result<ItemRow, CommonError> {
    use CommonError::*;
    let item_result = ItemRepository::new(connection).find_one_by_id(item_id);

    match item_result {
        Ok(item) => Ok(item),
        Err(RepositoryError::NotFound) => Err(ItemNotFound),
        Err(error) => Err(DatabaseError(error)),
    }
}

pub enum InsertAndDeleteError {
    LineDoesNotExist,
    NotInvoiceLine(String),
    BatchIsReserved,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertAndDeleteError {
    fn from(error: RepositoryError) -> Self {
        InsertAndDeleteError::DatabaseError(error)
    }
}

fn check_line_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, InsertAndDeleteError> {
    let result = InvoiceLineRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(line) => Ok(line),
        Err(RepositoryError::NotFound) => Err(InsertAndDeleteError::LineDoesNotExist),
        Err(error) => Err(error.into()),
    }
}

fn check_line_belongs_to_invoice(
    line: &InvoiceLineRow,
    invoice: &InvoiceRow,
) -> Result<(), InsertAndDeleteError> {
    if line.invoice_id == invoice.id {
        Err(InsertAndDeleteError::NotInvoiceLine(
            line.invoice_id.clone(),
        ))
    } else {
        Ok(())
    }
}

fn check_batch(
    line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<(), InsertAndDeleteError> {
    if let Some(batch_id) = &line.stock_line_id {
        if let Ok(batch) = StockLineRepository::new(connection).find_one_by_id(batch_id) {
            return check_batch_stock_reserved(line, batch);
        }
    }

    return Ok(());
}

fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: StockLineRow,
) -> Result<(), InsertAndDeleteError> {
    if line.number_of_packs != batch.available_number_of_packs {
        Err(InsertAndDeleteError::BatchIsReserved)
    } else {
        Ok(())
    }
}

pub fn generate_batch(
    InvoiceLineRow {
        stock_line_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        ..
    }: InvoiceLineRow,
    keep_existing_batch: bool,
    connection: &StorageConnection,
) -> Result<StockLineRow, RepositoryError> {
    // Generate new id if requested via parameter or if stock_line_id is not already set on line
    let stock_line_id = match (stock_line_id, keep_existing_batch) {
        (Some(stock_line_id), true) => stock_line_id,
        _ => Uuid::new_v4().to_string(),
    };

    let batch = StockLineRow {
        id: stock_line_id,
        item_id,
        store_id: current_store_id(connection)?,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs: number_of_packs,
        total_number_of_packs: number_of_packs,
        expiry_date,
    };

    Ok(batch)
}
