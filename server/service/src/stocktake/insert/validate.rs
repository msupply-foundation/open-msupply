use repository::{
    EqualFilter, MasterListFilter, MasterListRepository, RepositoryError, StocktakeFilter,
    StocktakeRepository, StorageConnection,
};

use crate::{check_location_exists, validate::check_store_exists};

use super::{InsertStocktake, InsertStocktakeError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake: &InsertStocktake,
) -> Result<(), InsertStocktakeError> {
    if stocktake.is_initial_stocktake == true {
        if !check_initial_stocktake_does_not_exist(connection, store_id)? {
            return Err(InsertStocktakeError::InitialStocktakeAlreadyExists);
        }
    }
    if !check_same_stocktake_does_not_exist(connection, &stocktake.id)? {
        return Err(InsertStocktakeError::StocktakeAlreadyExists);
    }
    if !check_store_exists(connection, store_id)? {
        return Err(InsertStocktakeError::InvalidStore);
    }
    // partial validation here for multiple args at once.
    if stocktake.master_list_id.is_some() && stocktake.location.is_some() {
        return Err(InsertStocktakeError::InvalidArguments);
    }
    if let Some(master_list_id) = &stocktake.master_list_id {
        if !check_master_list_exists(connection, store_id, master_list_id)? {
            return Err(InsertStocktakeError::InvalidMasterList);
        }
    }
    if !check_location_exists(connection, store_id, &stocktake.location)? {
        return Err(InsertStocktakeError::InvalidLocation);
    }

    Ok(())
}

// check for any stocktake before creating an initial stocktake
fn check_initial_stocktake_does_not_exist(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection).count(Some(
        StocktakeFilter::new().store_id(EqualFilter::equal_to(store_id)),
    ))?;
    Ok(count == 0)
}

// check for same stocktake id
fn check_same_stocktake_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection)
        .count(Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
}

fn check_master_list_exists(
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
