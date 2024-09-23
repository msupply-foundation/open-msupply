use repository::StorageConnection;

use crate::{
    check_location_exists,
    stocktake::common::{check_master_list_exists, check_stocktake_does_not_exist},
    validate::check_store_exists,
};

use super::{InsertStocktake, InsertStocktakeError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake: &InsertStocktake,
) -> Result<(), InsertStocktakeError> {
    if !check_stocktake_does_not_exist(connection, &stocktake.id)? {
        return Err(InsertStocktakeError::StocktakeAlreadyExists);
    }
    if !check_store_exists(connection, store_id)? {
        return Err(InsertStocktakeError::InvalidStore);
    }
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
