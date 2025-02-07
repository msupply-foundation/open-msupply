use repository::{
    name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinRowRepository},
    RepositoryError, StorageConnection,
};

pub fn get_insurances(
    connection: &StorageConnection,
    name_link_id: &str,
) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
    let repository = NameInsuranceJoinRowRepository::new(connection);
    let result = repository.find_many_by_name_link_id(&name_link_id)?;

    Ok(result)
}
