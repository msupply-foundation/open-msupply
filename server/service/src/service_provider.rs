use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::location::{query::LocationQueryService, LocationQueryServiceTrait, insert::{InsertLocationServiceTrait, InsertLocationService}};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub location_query_service: Box<dyn LocationQueryServiceTrait>,
    pub insert_location_service: Box<dyn InsertLocationServiceTrait>,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        ServiceProvider {
            connection_manager,
            location_query_service: Box::new(LocationQueryService {}),
            insert_location_service: Box::new(InsertLocationService {}),
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
