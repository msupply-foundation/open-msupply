use repository::{
    name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinRowRepository},
    StorageConnection,
};

use super::{UpdateInsurance, UpdateInsuranceError};

pub fn validate(
    connection: &StorageConnection,
    input: &UpdateInsurance,
) -> Result<NameInsuranceJoinRow, UpdateInsuranceError> {
    let name_insurance_join_row =
        NameInsuranceJoinRowRepository::new(connection).find_one_by_id(&input.id)?;

    let name_insurance_join_row = match name_insurance_join_row {
        Some(name_insurance_join_row) => name_insurance_join_row,
        None => return Err(UpdateInsuranceError::InsuranceDoesNotExist),
    };

    Ok(name_insurance_join_row)
}
