use repository::{
    name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinRowRepository},
    RepositoryError, StorageConnection,
};

use super::{UpdateInsurance, UpdateInsuranceError};

pub fn validate(
    connection: &StorageConnection,
    input: &UpdateInsurance,
) -> Result<NameInsuranceJoinRow, UpdateInsuranceError> {
    let name_insurance_join_row = match check_insurance_exists(&input.id, connection)? {
        Some(name_insurance_join_row) => name_insurance_join_row,
        None => return Err(UpdateInsuranceError::InsuranceDoesNotExist),
    };

    Ok(name_insurance_join_row)
}

pub fn check_insurance_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<NameInsuranceJoinRow>, RepositoryError> {
    NameInsuranceJoinRowRepository::new(connection).find_one_by_id(id)
}
