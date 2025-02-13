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
            validate(&input, connection)?;

            check_insurance_provider(
                connection,
                InsuranceProviderRow {
                    id: input.insurance_provider_id.clone(),
                    is_active: input.is_active,
                    provider_name: input.provider_name.clone(),
                    prescription_validity_days: None,
                    comment: None,
                },
                input.expiry_date,
            )?;

            let new_insurance = generate(GenerateInput {
                insert_input: input.clone(),
            });
            NameInsuranceJoinRowRepository::new(connection).upsert_one(&new_insurance)?;

            Ok(new_insurance)
        })
        .map_err(|error: TransactionError<InsertInsuranceError>| error.to_inner_error())?;
    Ok(insurance)
}

fn check_insurance_provider(
    connection: &StorageConnection,
    input: InsuranceProviderRow,
    expiry_date: chrono::NaiveDate,
) -> Result<(), RepositoryError> {
    let InsuranceProviderRow {
        id,
        is_active,
        provider_name,
        ..
    } = input;
    let repo = InsuranceProviderRowRepository::new(connection);

    let today = Utc::now().date_naive();
    let days = Some(expiry_date.signed_duration_since(today).num_days() as i32);

    // find insurance provider
    // if not found then we create it
    if repo.find_one_by_id(&id)?.is_none() {
        let new_insurance_provider = InsuranceProviderRow {
            id: id,
            is_active: is_active,
            provider_name: provider_name,
            prescription_validity_days: days,
            comment: None,
        };
        repo.upsert_one(&new_insurance_provider)?;
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
