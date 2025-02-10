use repository::{
    name_insurance_join_row::{
        NameInsuranceJoinFilter, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
        NameInsuranceJoinSort,
    },
    RepositoryError, StorageConnection,
};

pub fn insurances(
    connection: &StorageConnection,
    name_link_id: &str,
    filter: Option<NameInsuranceJoinFilter>,
    sort: Option<NameInsuranceJoinSort>,
) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
    let repository = NameInsuranceJoinRowRepository::new(connection);
    let result = repository.find_many_by_name_link_id(name_link_id, filter, sort)?;

    Ok(result)
}
