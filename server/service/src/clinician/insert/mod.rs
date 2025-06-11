use repository::{
    clinician_row::{ClinicianRow, ClinicianRowRepository},
    ClinicianRowRepositoryTrait, GenderType, RepositoryError, TransactionError,
};
mod generate;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertClinicianError {
    ClinicianAlreadyExists,
    InvalidStore,
    CodeCannotBeEmpty,
    InitialsCannotBeEmpty,
    LastNameCannotBeEmpty,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertClinician {
    pub id: String,
    pub code: String,
    pub initials: String,
    pub last_name: String,
    pub first_name: Option<String>,
    pub gender: Option<GenderType>,
}

pub fn insert_clinician(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertClinician,
) -> Result<ClinicianRow, InsertClinicianError> {
    let new_clinician = ctx
        .connection
        .transaction_sync(|connection| {
            let clinician_repo = ClinicianRowRepository::new(connection);
            validate(&clinician_repo, &input)?;

            let new_clinician = generate(GenerateInput {
                store_id: store_id.to_string(),
                insert_input: input.clone(),
            });

            clinician_repo.upsert_one(&new_clinician)?;

            Ok(new_clinician)
        })
        .map_err(|error: TransactionError<InsertClinicianError>| error.to_inner_error())?;
    Ok(new_clinician)
}
impl From<RepositoryError> for InsertClinicianError {
    fn from(error: RepositoryError) -> Self {
        InsertClinicianError::DatabaseError(error)
    }
}
