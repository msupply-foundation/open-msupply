use crate::{
    program::validate::check_immunisation_program_exists, service_provider::ServiceContext,
};

use repository::{ProgramRowRepository, RepositoryError, StorageConnection};

#[derive(PartialEq, Debug)]
pub enum DeleteImmunisationProgramError {
    ImmunisationProgramDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn delete_immunisation_program(
    ctx: &ServiceContext,
    id: String,
) -> Result<String, DeleteImmunisationProgramError> {
    let immunisation_program_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &id)?;

            let repo = ProgramRowRepository::new(connection);

            repo.mark_deleted(&id)
                .map(|_| id)
                .map_err(DeleteImmunisationProgramError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(immunisation_program_id)
}

impl From<RepositoryError> for DeleteImmunisationProgramError {
    fn from(error: RepositoryError) -> Self {
        DeleteImmunisationProgramError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), DeleteImmunisationProgramError> {
    check_immunisation_program_exists(id, connection)?
        .ok_or(DeleteImmunisationProgramError::ImmunisationProgramDoesNotExist)?;

    Ok(())
}
