use repository::{
    EqualFilter, MasterListFilter, MasterListRepository, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository, StocktakeFilter, StocktakeLine, StocktakeLineFilter,
    StocktakeLineRepository, StocktakeRepository, StocktakeRow, StocktakeRowRepository,
    StocktakeStatus, StorageConnection,
};

use super::UpdateStocktake;

pub fn check_stocktake_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection)
        .count(Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
}

pub fn check_master_list_exists(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<bool, RepositoryError> {
    let count = MasterListRepository::new(connection).count(Some(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id))
            .exists_for_store_id(EqualFilter::equal_to(store_id)),
    ))?;
    Ok(count > 0)
}

pub fn check_stocktake_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeRow>, RepositoryError> {
    StocktakeRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_stocktake_not_finalised(status: &StocktakeStatus) -> bool {
    *status != StocktakeStatus::Finalised
}

pub fn check_no_stocktake_lines_exist(
    connection: &StorageConnection,
    stocktake_line_id: &str,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    let result = StocktakeLineRepository::new(connection).count(
        Some(StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_line_id))),
        Some(store_id.to_string()),
    )?;
    Ok(result == 0)
}

pub enum AdditionInvoiceCheckError {
    DoesNotExist,
    NotAnInboundInvoice,
}

pub fn check_snapshot_matches_current_count(
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

pub fn check_stock_lines_reduced_to_zero(
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

pub fn load_stocktake_lines(
    connection: &StorageConnection,
    stocktake_id: &str,
    store_id: &str,
) -> Result<Vec<StocktakeLine>, RepositoryError> {
    StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(stocktake_id)),
        Some(store_id.to_string()),
    )
}

pub fn check_stocktake_is_not_locked(input: &UpdateStocktake, existing: &StocktakeRow) -> bool {
    match &input.is_locked {
        Some(false) => true,
        _ => !existing.is_locked,
    }
}
