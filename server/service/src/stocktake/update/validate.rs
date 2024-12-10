use repository::{
    EqualFilter, RepositoryError, StockLine, StockLineFilter, StockLineRepository, StocktakeLine,
    StocktakeLineFilter, StocktakeLineRepository, StocktakeRow, StorageConnection,
};

use crate::{
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
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

fn check_snapshot_matches_current_count(
    stocktake_lines: &[StocktakeLine],
) -> Option<Vec<StocktakeLine>> {
    let mut mismatches = Vec::new();
    for line in stocktake_lines {
        let stock_line = match &line.stock_line {
            Some(stock_line) => stock_line,
            None => continue,
        };
        if line.line.snapshot_number_of_packs != stock_line.total_number_of_packs {
            mismatches.push(line.clone());
        }
    }
    if !mismatches.is_empty() {
        return Some(mismatches);
    }
    None
}

fn check_stock_lines_reduced_to_zero(
    connection: &StorageConnection,
    stocktake_lines: &Vec<StocktakeLine>,
) -> Result<Option<Vec<StockLine>>, RepositoryError> {
    let mut lines_reduced_to_zero = Vec::new();

    for line in stocktake_lines {
        let stock_line_row = match &line.stock_line {
            Some(stock_line) => stock_line,
            None => continue,
        };
        if let Some(counted_number_of_packs) = line.line.counted_number_of_packs {
            let adjustment = stock_line_row.total_number_of_packs - counted_number_of_packs;

            if adjustment > 0.0
                && (stock_line_row.total_number_of_packs - adjustment < 0.0
                    || stock_line_row.available_number_of_packs - adjustment < 0.0)
            {
                let stock_line = StockLineRepository::new(connection)
                    .query_by_filter(
                        StockLineFilter::new().id(EqualFilter::equal_to(&stock_line_row.id)),
                        None,
                    )?
                    .pop()
                    .ok_or(RepositoryError::NotFound)?;

                lines_reduced_to_zero.push(stock_line.clone())
            }
        }
    }

    if !lines_reduced_to_zero.is_empty() {
        return Ok(Some(lines_reduced_to_zero));
    }
    Ok(None)
}

fn load_stocktake_lines(
    connection: &StorageConnection,
    stocktake_id: &str,
    store_id: &str,
) -> Result<Vec<StocktakeLine>, RepositoryError> {
    StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_id)),
        Some(store_id.to_string()),
    )
}

fn check_stocktake_is_not_locked(input: &UpdateStocktake, existing: &StocktakeRow) -> bool {
    match &input.is_locked {
        Some(false) => true,
        _ => !existing.is_locked,
    }
}
