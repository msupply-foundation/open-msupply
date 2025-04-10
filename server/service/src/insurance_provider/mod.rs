use query::insurance_providers;
use repository::{InsuranceProviderRow, RepositoryError, StorageConnection};

pub mod query;

pub trait InsuranceProviderServiceTrait: Sync + Send {
    fn insurance_providers(
        &self,
        connection: &StorageConnection,
    ) -> Result<Vec<InsuranceProviderRow>, RepositoryError> {
        insurance_providers(connection)
    }
}

pub struct InsuranceProviderService {}
impl InsuranceProviderServiceTrait for InsuranceProviderService {}
