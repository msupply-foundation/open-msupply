use repository::{RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection};

use super::{
    common::calculate_stock_line_total,
    insert::{InsertRepack, InsertRepackError},
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertRepack,
) -> Result<StockLineRow, InsertRepackError> {
    let stock_line = match check_stock_line_exists(connection, &input.stock_line_id)? {
        Some(stock_line) => stock_line,
        None => return Err(InsertRepackError::StockLineDoesNotExist),
    };

    if store_id != stock_line.store_id {
        return Err(InsertRepackError::NotThisStoreStockLine);
    };

    if check_packs_are_fractional(input) {
        return Err(InsertRepackError::CannotHaveFractionalRepack);
    }

    if check_stock_line_reduced_to_zero(input, &stock_line) {
        return Err(InsertRepackError::StockReducedBelowZero(stock_line));
    }

    Ok(stock_line)
}

fn check_stock_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockLineRow>, RepositoryError> {
    Ok(StockLineRowRepository::new(connection).find_one_by_id_option(id)?)
}

fn check_stock_line_reduced_to_zero(input: &InsertRepack, stock_line: &StockLineRow) -> bool {
    let stock_line_total = calculate_stock_line_total(stock_line);

    if stock_line_total < input.number_of_packs {
        return true;
    }
    false
}

fn check_packs_are_fractional(input: &InsertRepack) -> bool {
    let split_pack = input.number_of_packs / input.new_pack_size as f64;

    if split_pack.fract() != 0.0 {
        return true;
    }
    false
}
