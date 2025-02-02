use repository::{
    abbreviation::{Abbreviation, AbbreviationFilter, AbbreviationRepository},
    RepositoryError, StorageConnectionManager,
};

pub fn get_all_abbreviations(
    connection_manager: &StorageConnectionManager,
    filter: AbbreviationFilter,
) -> Result<Vec<Abbreviation>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let repository = AbbreviationRepository::new(&connection);

    let rows = repository.query_by_filter(filter.clone())?;

    Ok(rows)
}
