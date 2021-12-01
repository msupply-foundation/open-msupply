use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::location::{LocationServiceTrait, LocationService};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub location_service: Box<dyn LocationServiceTrait>,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        ServiceProvider {
            connection_manager,
            location_service: Box::new(LocationService {}),
        }
    }

    pub fn context(&self) -> Result<ServiceContext, RepositoryError> {
        Ok(ServiceContext {
            connection: self.connection()?,
        })
    }

    pub fn connection(&self) -> Result<StorageConnection, RepositoryError> {
        self.connection_manager.connection()
    }
}
