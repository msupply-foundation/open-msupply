use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
    },
    RepositoryError, TransactionError,
};

use crate::{service_provider::ServiceContext, SingleRecordError};

mod generate;
mod test;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum InsertInsuranceError {
    InsuranceAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertInsuranceError {
    fn from(error: RepositoryError) -> Self {
        InsertInsuranceError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertInsuranceError {
    fn from(error: SingleRecordError) -> Self {
        use InsertInsuranceError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertInsurance {
    pub id: String,
    pub name_link_id: String,
    pub insurance_provider_id: String,
    pub policy_number_person: String,
    pub policy_number_family: String,
    pub policy_type: InsurancePolicyType,
    pub discount_percentage: f64,
    pub expiry_date: chrono::NaiveDate,
    pub is_active: bool,
}

pub fn insert_insurance(
    ctx: &ServiceContext,
    input: InsertInsurance,
) -> Result<NameInsuranceJoinRow, InsertInsuranceError> {
    let insurance = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input.id, connection)?;

            let new_insurance = generate(GenerateInput {
                insert_input: input.clone(),
            });
            NameInsuranceJoinRowRepository::new(connection).upsert_one(&new_insurance)?;

            Ok(new_insurance)
        })
        .map_err(|error: TransactionError<InsertInsuranceError>| error.to_inner_error())?;
    Ok(insurance)
}
