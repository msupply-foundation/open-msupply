use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::location::{
    insert::{InsertLocationService, InsertLocationServiceTrait},
    query::LocationQueryService,
    update::{UpdateLocationService, UpdateLocationServiceTrait},
    LocationQueryServiceTrait,
};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub location_query_service: Box<dyn LocationQueryServiceTrait>,
    pub insert_location_service: Box<dyn InsertLocationServiceTrait>,
    pub update_location_service: Box<dyn UpdateLocationServiceTrait>,
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
            update_location_service: Box::new(UpdateLocationService {}),
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
