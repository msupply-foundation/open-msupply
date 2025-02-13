use chrono::{NaiveDate, Utc};
use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
    },
    InsuranceProviderRow, InsuranceProviderRowRepository, RepositoryError, StorageConnection,
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
    pub policy_type: Option<InsurancePolicyType>,
    pub discount_percentage: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
    pub provider_name: Option<String>,
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

            update_insurance_provider(connection, &input, &new_insurance.insurance_provider_id)?;

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

fn update_insurance_provider(
    connection: &StorageConnection,
    input: &UpdateInsurance,
    insurance_provider_id: &String,
) -> Result<(), UpdateInsuranceError> {
    let insurance_provider_repository = InsuranceProviderRowRepository::new(connection);

    let insurance_provider_row =
        insurance_provider_repository.find_one_by_id(insurance_provider_id)?;

    if let Some(insurance_provider_row) = insurance_provider_row {
        let today = Utc::now().date_naive();

        let valid_days = input
            .expiry_date
            .map(|expiry_date| expiry_date.signed_duration_since(today).num_days() as i32);

        let prescription_validity_days =
            valid_days.or(insurance_provider_row.prescription_validity_days);

        let provider_name = input
            .provider_name
            .clone()
            .unwrap_or(insurance_provider_row.provider_name);

        let new_insurance_provider = InsuranceProviderRow {
            id: insurance_provider_id.clone(),
            provider_name,
            prescription_validity_days,
            comment: insurance_provider_row.comment,
            is_active: input.is_active.unwrap_or(insurance_provider_row.is_active),
        };

        insurance_provider_repository.upsert_one(&new_insurance_provider)?;
    }

    Ok(())
}
