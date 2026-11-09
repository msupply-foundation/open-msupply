use repository::{
    RepositoryError, StorageConnection,
    insurance_provider_row::{InsuranceProviderRow, InsuranceProviderRowRepository},
};

pub fn insurance_providers(
    connection: &StorageConnection,
) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
    let result = InsuranceProviderRowRepository::new(connection).find_all_active()?;
    Ok(result)
}
