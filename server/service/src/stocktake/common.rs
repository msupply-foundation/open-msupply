use repository::{
    EqualFilter, MasterListFilter, MasterListRepository, RepositoryError, StocktakeFilter,
    StocktakeLineFilter, StocktakeLineRepository, StocktakeRepository, StocktakeRow,
    StocktakeRowRepository, StocktakeStatus, StorageConnection,
};

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
