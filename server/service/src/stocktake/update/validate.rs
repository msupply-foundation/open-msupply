use repository::{RepositoryError, StocktakeLine, StocktakeRow, StorageConnection};

use crate::{
    stocktake::{
        check_snapshot_matches_current_count, check_stock_lines_reduced_to_zero,
        check_stocktake_exist, check_stocktake_is_not_locked, check_stocktake_not_finalised,
        load_stocktake_lines,
    },
    validate::check_store_id_matches,
};

use super::{UpdateStocktake, UpdateStocktakeError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLine>, bool), UpdateStocktakeError> {
    let existing = match check_stocktake_exist(connection, &input.id)? {
        Some(existing) => existing,
        None => return Err(UpdateStocktakeError::StocktakeDoesNotExist),
    };
    if !check_stocktake_not_finalised(&existing.status) {
        return Err(UpdateStocktakeError::CannotEditFinalised);
    }

    if !check_stocktake_is_not_locked(input, &existing) {
        return Err(UpdateStocktakeError::StocktakeIsLocked);
    }

    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(UpdateStocktakeError::InvalidStore);
    }
    let stocktake_lines = load_stocktake_lines(connection, &input.id, store_id)?;

    let status_changed = input.status.is_some();
    if status_changed {
        if stocktake_lines.is_empty() {
            return Err(UpdateStocktakeError::NoLines);
        }

        if let Some(stock_reduced_to_zero) =
            check_stock_lines_reduced_to_zero(connection, &stocktake_lines)?
        {
            return Err(UpdateStocktakeError::StockLinesReducedBelowZero(
                stock_reduced_to_zero,
            ));
        }

        if let Some(mismatches) = check_snapshot_matches_current_count(&stocktake_lines) {
            return Err(UpdateStocktakeError::SnapshotCountCurrentCountMismatch(
                mismatches,
            ));
        }
    }

    Ok((existing, stocktake_lines, status_changed))
}

impl From<RepositoryError> for UpdateStocktakeError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeError::DatabaseError(error)
    }
}
