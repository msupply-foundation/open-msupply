use repository::{StorageConnection, name_insurance_join_row::NameInsuranceJoinRowRepository};

use super::InsertInsuranceError;

pub fn validate(id: &str, connection: &StorageConnection) -> Result<(), InsertInsuranceError> {
    let insurance = NameInsuranceJoinRowRepository::new(connection).find_one_by_id(id)?;

    if insurance.is_some() {
        return Err(InsertInsuranceError::InsuranceAlreadyExists);
    }

    Ok(())
}
