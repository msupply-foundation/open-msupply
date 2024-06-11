use super::{query::get_program, validate::check_program_name_exists};
use crate::{
    activity_log::activity_log_entry, program::validate::check_immunisation_program_exists,
    service_provider::ServiceContext, SingleRecordError,
};

use repository::{
    ActivityLogType, ProgramRow, ProgramRowRepository, RepositoryError, StorageConnection,
};
use util::constants::IMMUNISATION_CONTEXT_ID;

#[derive(PartialEq, Debug)]
pub enum UpdateImmunisationProgramError {
    ImmunisationProgramDoesNotExist,
    ImmunisationProgramNameExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateImmunisationProgram {
    pub id: String,
    pub name: String,
}

pub fn update_immunisation_program(
    ctx: &ServiceContext,
    input: UpdateImmunisationProgram,
) -> Result<ProgramRow, UpdateImmunisationProgramError> {
    let immunisation_program = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_immunisation_program = generate(input);
            ProgramRowRepository::new(connection).upsert_one(&new_immunisation_program)?;

            activity_log_entry(
                ctx,
                ActivityLogType::ProgramUpdated,
                Some(new_immunisation_program.id.clone()),
                None,
                None,
            )?;

            get_program(&ctx.connection, new_immunisation_program.id)
                .map_err(UpdateImmunisationProgramError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(immunisation_program)
}

pub fn validate(
    input: &UpdateImmunisationProgram,
    connection: &StorageConnection,
) -> Result<(), UpdateImmunisationProgramError> {
    if check_immunisation_program_exists(&input.id, connection)?.is_none() {
        return Err(UpdateImmunisationProgramError::ImmunisationProgramDoesNotExist);
    }
    if check_program_name_exists(&input.name, Some(input.id.to_owned()), connection)?.is_some() {
        return Err(UpdateImmunisationProgramError::ImmunisationProgramNameExists);
    }

    Ok(())
}

pub fn generate(UpdateImmunisationProgram { id, name }: UpdateImmunisationProgram) -> ProgramRow {
    ProgramRow {
        id,
        name,
        master_list_id: None,
        context_id: IMMUNISATION_CONTEXT_ID.to_string(),
        is_immunisation: true,
    }
}

impl From<RepositoryError> for UpdateImmunisationProgramError {
    fn from(error: RepositoryError) -> Self {
        UpdateImmunisationProgramError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for UpdateImmunisationProgramError {
    fn from(error: SingleRecordError) -> Self {
        use UpdateImmunisationProgramError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
