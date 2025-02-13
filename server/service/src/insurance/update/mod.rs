use chrono::NaiveDate;
use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
    },
    RepositoryError,
};

use crate::{service_provider::ServiceContext, SingleRecordError};

mod generate;
mod test;
mod validate;

use generate::{generate, GenerateInput};
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdateInsuranceError {
    InsuranceDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpdateInsurance {
    pub id: String,
    pub name_link_id: Option<String>,
    pub insurance_provider_id: Option<String>,
    pub policy_number: Option<String>,
    pub policy_type: Option<InsurancePolicyType>,
    pub discount_percentage: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
}

pub fn update_insurance(
    ctx: &ServiceContext,
    input: UpdateInsurance,
) -> Result<NameInsuranceJoinRow, UpdateInsuranceError> {
    let insurance = ctx
        .connection
        .transaction_sync(|connection| {
            let insurance_row = validate(connection, &input)?;
            let updated_insurance_row = generate(GenerateInput {
                update_input: input,
                name_insurance_join_row: insurance_row,
            });

            let repository = NameInsuranceJoinRowRepository::new(connection);

            repository.upsert_one(&updated_insurance_row)?;

            match repository.find_one_by_id(&updated_insurance_row.id)? {
                Some(insurance) => Ok(insurance),
                None => Err(UpdateInsuranceError::UpdatedRecordNotFound),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(insurance)
}

impl From<RepositoryError> for UpdateInsuranceError {
    fn from(error: RepositoryError) -> Self {
        UpdateInsuranceError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateInsuranceError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateInsuranceError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => UpdatedRecordNotFound,
        }
    }
}
