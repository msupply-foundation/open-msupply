use repository::{
    name_insurance_join_row::NameInsuranceJoinRowRepository, RepositoryError, StorageConnection,
};

use super::{InsertInsurance, InsertInsuranceError};

pub fn validate(
    input: &InsertInsurance,
    connection: &StorageConnection,
) -> Result<(), InsertInsuranceError> {
    if check_insurance_record_exists(&input.id, connection)? {
        return Err(InsertInsuranceError::InsuranceAlreadyExists);
    }

    Ok(())
}

pub fn check_insurance_record_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let result = NameInsuranceJoinRowRepository::new(connection).find_one_by_id(id)?;

    Ok(result.is_some())
}
