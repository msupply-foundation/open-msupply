use repository::{
    EqualFilter, ProgramFilter, ProgramRepository, ProgramRow, ProgramRowRepository,
    RepositoryError, StorageConnection, StringFilter,
};

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
pub fn check_program_name_exists(
    name: &str,
    id: Option<String>,
    connection: &StorageConnection,
) -> Result<Option<ProgramRow>, RepositoryError> {
    let mut filter = ProgramFilter::new().name(StringFilter::equal_to(name));
    if let Some(id) = id {
        filter = filter.id(EqualFilter::not_equal_to(&id));
    }

    let program = ProgramRepository::new(connection).query_one(filter)?;
    Ok(program)
}
