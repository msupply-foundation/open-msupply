use chrono::NaiveDate;
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

pub fn update_insurance(
    ctx: &ServiceContext,
    input: UpdateInsurance,
) -> Result<NameInsuranceJoinRow, UpdateInsuranceError> {
    let insurance = ctx
        .connection
        .transaction_sync(|connection| {
            let insurance_row = validate(connection, &input.clone())?;
            let updated_insurance_row = generate(GenerateInput {
                update_input: input.clone(),
                name_insurance_join_row: insurance_row,
            });

            if let Some(provider_name) = &input.provider_name {
                update_insurance_provider(
                    connection,
                    Some(updated_insurance_row.insurance_provider_id.clone()),
                    Some(provider_name.clone()),
                )?;
            }

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

pub fn update_insurance_provider(
    connection: &StorageConnection,
    insurance_provider_id: Option<String>,
    provider_name: Option<String>,
) -> Result<Option<InsuranceProviderRow>, RepositoryError> {
    match (insurance_provider_id, provider_name) {
        (Some(id), Some(provider_name)) => {
            let mut existing_provider = InsuranceProviderRowRepository::new(connection)
                .find_one_by_id(&id)?
                .ok_or(RepositoryError::NotFound)?;

            existing_provider.provider_name = provider_name;

            InsuranceProviderRowRepository::new(connection).upsert_one(&existing_provider)?;
            Ok(Some(existing_provider))
        }
        _ => Ok(None),
    }
}

#[derive(Default, Clone)]
pub struct UpdateInsurance {
    pub id: String,
    pub policy_number: Option<String>,
    pub policy_type: Option<InsurancePolicyType>,
    pub discount_percentage: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
    pub provider_name: Option<String>,
}

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
