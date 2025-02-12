use repository::{
    name_insurance_join_row::{
        NameInsuranceJoinFilter, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
        NameInsuranceJoinSort,
    },
    RepositoryError, StorageConnection,
};

pub fn insurances(
    connection: &StorageConnection,
    name_id: &str,
    filter: Option<NameInsuranceJoinFilter>,
    sort: Option<NameInsuranceJoinSort>,
) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
    let repository = NameInsuranceJoinRowRepository::new(connection);
    let result = repository.find_many_by_name_id(name_id, filter, sort)?;

    Ok(result)
}
