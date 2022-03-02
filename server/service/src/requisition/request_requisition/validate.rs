use repository::{
    EqualFilter, Name, NameFilter, NameQueryRepository, RepositoryError, StorageConnection,
};

pub fn check_other_party_exists(
    connection: &StorageConnection,
    other_party_id: &str,
) -> Result<Option<Name>, RepositoryError> {
    // TODO store_id check
    let result = NameQueryRepository::new(connection)
        .query_by_filter(NameFilter::new().id(EqualFilter::equal_to(other_party_id)))?
        .pop();

    Ok(result)
}
