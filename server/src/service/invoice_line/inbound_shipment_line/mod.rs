pub mod delete;
pub mod insert;
pub mod update;
use uuid::Uuid;

use crate::{
    database::{
        repository::{RepositoryError, StockLineRepository, StorageConnection},
        schema::{InvoiceLineRow, StockLineRow},
    },
    service::{invoice::current_store_id, WithDBError},
};

pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;
pub struct PackSizeBelowOne;

fn check_pack_size(pack_size_option: Option<u32>) -> Result<(), PackSizeBelowOne> {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1 {
            return Err(PackSizeBelowOne {});
        }
    }
    Ok(())
}

pub struct BatchIsReserved;

fn check_batch(
    line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<(), WithDBError<BatchIsReserved>> {
    if let Some(batch_id) = &line.stock_line_id {
        match StockLineRepository::new(connection).find_one_by_id(batch_id) {
            Ok(batch) => return check_batch_stock_reserved(line, batch),
            Err(error) => return Err(WithDBError::db(error)),
        };
    }

    return Ok(());
}

fn check_batch_stock_reserved(
    line: &InvoiceLineRow,
    batch: StockLineRow,
) -> Result<(), WithDBError<BatchIsReserved>> {
    if line.number_of_packs != batch.available_number_of_packs {
        Err(WithDBError::err(BatchIsReserved))
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
        note,
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
        on_hold: false,
        note,
    };

    Ok(batch)
}
