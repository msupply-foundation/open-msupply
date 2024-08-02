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
pub enum InsertImmunisationProgramError {
    ImmunisationProgramAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertImmunisationProgram {
    pub id: String,
    pub name: String,
}

pub fn insert_immunisation_program(
    ctx: &ServiceContext,
    input: InsertImmunisationProgram,
) -> Result<ProgramRow, InsertImmunisationProgramError> {
    let immunisation_program = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_immunisation_program = generate(input);
            ProgramRowRepository::new(connection).upsert_one(&new_immunisation_program)?;

            activity_log_entry(
                ctx,
                ActivityLogType::ProgramCreated,
                Some(new_immunisation_program.id.clone()),
                None,
                None,
            )?;

            get_program(&ctx.connection, new_immunisation_program.id)
                .map_err(InsertImmunisationProgramError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(immunisation_program)
}

pub fn validate(
    input: &InsertImmunisationProgram,
    connection: &StorageConnection,
) -> Result<(), InsertImmunisationProgramError> {
    if check_immunisation_program_exists(&input.id, connection)?.is_some() {
        return Err(InsertImmunisationProgramError::ImmunisationProgramAlreadyExists);
    }
    if check_program_name_exists(&input.name, None, connection)?.is_some() {
        return Err(InsertImmunisationProgramError::ImmunisationProgramAlreadyExists);
    }

    Ok(())
}

pub fn generate(InsertImmunisationProgram { id, name }: InsertImmunisationProgram) -> ProgramRow {
    ProgramRow {
        id,
        name,
        master_list_id: None,
        context_id: IMMUNISATION_CONTEXT_ID.to_string(),
        is_immunisation: true,
        deleted_datetime: None,
    }
}

impl From<RepositoryError> for InsertImmunisationProgramError {
    fn from(error: RepositoryError) -> Self {
        InsertImmunisationProgramError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertImmunisationProgramError {
    fn from(error: SingleRecordError) -> Self {
        use InsertImmunisationProgramError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
