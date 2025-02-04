use repository::{
    abbreviation::{Abbreviation, AbbreviationFilter, AbbreviationRepository},
    RepositoryError, StorageConnectionManager,
};

pub fn get_all_abbreviations(
    connection_manager: &StorageConnectionManager,
    filter: Option<AbbreviationFilter>,
) -> Result<Vec<Abbreviation>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let repository = AbbreviationRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(rows)
}
