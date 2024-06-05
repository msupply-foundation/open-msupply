use repository::{ProgramRow, ProgramRowRepository, RepositoryError, StorageConnection};

pub fn check_immunisation_program_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<ProgramRow>, RepositoryError> {
    let program = ProgramRowRepository::new(connection).find_one_by_id(id)?;
    match program {
        Some(program) => match program.is_immunisation {
            true => Ok(Some(program)),
            false => Ok(None),
        },
        None => Ok(None),
    }
}
