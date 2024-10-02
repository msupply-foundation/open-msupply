use repository::StorageConnection;

use crate::{
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::check_stocktake_line_exist,
    validate::check_store_id_matches,
};

use super::DeleteStocktakeLineError;

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_line_id: &str,
) -> Result<(), DeleteStocktakeLineError> {
    let line = match check_stocktake_line_exist(connection, stocktake_line_id)? {
        Some(line) => line.line,
        None => return Err(DeleteStocktakeLineError::StocktakeLineDoesNotExist),
    };
    let stocktake = match check_stocktake_exist(connection, &line.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => {
            return Err(DeleteStocktakeLineError::InternalError(format!(
                "Stocktake is missing: {}",
                line.stocktake_id
            )))
        }
    };

    if stocktake.is_locked {
        return Err(DeleteStocktakeLineError::StocktakeIsLocked);
    }

    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(DeleteStocktakeLineError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(DeleteStocktakeLineError::InvalidStore);
    }
    Ok(())
}
