use chrono::Utc;
use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
    },
    InsuranceProviderRow, InsuranceProviderRowRepository, RepositoryError, StorageConnection,
    TransactionError,
};

use crate::{service_provider::ServiceContext, SingleRecordError};

mod generate;
mod test;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

pub fn insert_insurance(
    ctx: &ServiceContext,
    input: InsertInsurance,
) -> Result<NameInsuranceJoinRow, InsertInsuranceError> {
    let insurance = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input.id, connection)?;

            insert_insurance_provider(connection, &input)?;

            let new_insurance = generate(GenerateInput {
                insert_input: input.clone(),
            });
            NameInsuranceJoinRowRepository::new(connection).upsert_one(&new_insurance)?;

            Ok(new_insurance)
        })
        .map_err(|error: TransactionError<InsertInsuranceError>| error.to_inner_error())?;
    Ok(insurance)
}

pub fn insert_insurance_provider(
    connection: &StorageConnection,
    input: &InsertInsurance,
) -> Result<(), InsertInsuranceError> {
    let insurance_provider_repository = InsuranceProviderRowRepository::new(connection);

    let insurance_provider_not_exists = insurance_provider_repository
        .find_one_by_id(&input.insurance_provider_id)?
        .is_none();

    if insurance_provider_not_exists {
        let today = Utc::now().date_naive();

        let valid_days = Some(input.expiry_date.signed_duration_since(today).num_days() as i32);

        insurance_provider_repository.upsert_one(&InsuranceProviderRow {
            id: input.insurance_provider_id.clone(),
            is_active: input.is_active,
            provider_name: input.provider_name.clone(),
            prescription_validity_days: valid_days,
            comment: None,
        })?;
    }

    Ok(())
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertInsurance {
    pub id: String,
    pub name_link_id: String,
    pub insurance_provider_id: String,
    pub policy_number_person: Option<String>,
    pub policy_number: String,
    pub policy_type: InsurancePolicyType,
    pub discount_percentage: f64,
    pub expiry_date: chrono::NaiveDate,
    pub is_active: bool,
    pub provider_name: String,
}

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
