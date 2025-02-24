use repository::{
    insurance_provider_row::{InsuranceProviderRow, InsuranceProviderRowRepository},
    RepositoryError, StorageConnection,
};

pub fn insurance_providers(
    connection: &StorageConnection,
) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
    let result = InsuranceProviderRowRepository::new(connection).find_all()?;
    Ok(result)
}
