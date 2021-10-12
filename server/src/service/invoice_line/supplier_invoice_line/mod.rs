pub mod insert;
use crate::database::{
    repository::{ItemRepository, RepositoryError, StorageConnection},
    schema::ItemRow,
};

pub use self::insert::*;

pub enum CommonError {
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    ItemNotFound,
    DatabaseError(RepositoryError),
}

fn check_pack_size(pack_size_option: Option<u32>) -> Result<(), CommonError> {
    if let Some(pack_size) = pack_size_option {
        if pack_size < 1 {
            Err(CommonError::PackSizeBelowOne)
        } else {
            Ok(())
        }
    } else {
        Ok(())
    }
}

fn check_number_of_packs(number_of_packs_option: Option<u32>) -> Result<(), CommonError> {
    if let Some(number_of_packs) = number_of_packs_option {
        if number_of_packs < 1 {
            Err(CommonError::NumberOfPacksBelowOne)
        } else {
            Ok(())
        }
    } else {
        Ok(())
    }
}

fn check_item(item_id: &str, connection: &StorageConnection) -> Result<ItemRow, CommonError> {
    use CommonError::*;
    let item_result = ItemRepository::new(connection).find_one_by_id(item_id);

    match item_result {
        Ok(item) => Ok(item),
        Err(RepositoryError::NotFound) => Err(ItemNotFound),
        Err(error) => Err(DatabaseError(error)),
    }
}
