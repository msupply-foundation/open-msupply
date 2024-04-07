use repository::{RepositoryError, StockLine, StockLineRow, StorageConnection};

use crate::common_stock::{check_stock_line_exists, CommonStockLineError};

use super::insert::{InsertRepack, InsertRepackError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertRepack,
) -> Result<StockLine, InsertRepackError> {
    use InsertRepackError::*;

    let stock_line = check_stock_line_exists(connection, store_id, &input.stock_line_id).map_err(
        |err| match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
            CommonStockLineError::StockLineDoesNotBelongToStore => NotThisStoreStockLine,
        },
    )?;

    if check_stock_line_reduced_to_zero(input, &stock_line.stock_line_row) {
        return Err(StockLineReducedBelowZero(stock_line));
    }

    if check_packs_are_fractional(input, &stock_line.stock_line_row) {
        return Err(CannotHaveFractionalPack);
    }

    Ok(stock_line)
}

fn check_stock_line_reduced_to_zero(input: &InsertRepack, stock_line: &StockLineRow) -> bool {
    stock_line.available_number_of_packs < input.number_of_packs
}

fn check_packs_are_fractional(input: &InsertRepack, stock_line: &StockLineRow) -> bool {
    let split_pack =
        input.number_of_packs * stock_line.pack_size as f64 / input.new_pack_size as f64;

    if split_pack.fract() != 0.0 {
        return true;
    }
    false
}
