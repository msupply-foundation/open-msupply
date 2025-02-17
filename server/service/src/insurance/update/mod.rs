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

#[derive(Default, Clone)]
pub struct UpdateInsurance {
    pub id: String,
    pub insurance_provider_id: Option<String>,
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
            let insurance = validate(connection, &input.clone())?;
            let new_insurance = generate(GenerateInput {
                update_input: input.clone(),
                name_insurance_join_row: insurance,
            });

            let insurance_repository = NameInsuranceJoinRowRepository::new(connection);

            insurance_repository.upsert_one(&new_insurance)?;

            match insurance_repository.find_one_by_id(&new_insurance.id)? {
                Some(insurance) => Ok(insurance),
                None => Err(UpdateInsuranceError::UpdatedRecordNotFound),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(insurance)
}
