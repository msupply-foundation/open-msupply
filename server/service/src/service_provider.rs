use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::{
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
    stock_take::{StockTakeService, StockTakeServiceTrait},
};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub location_service: Box<dyn LocationServiceTrait>,
    pub master_list_service: Box<dyn MasterListServiceTrait>,
    pub stock_take_service: Box<dyn StockTakeServiceTrait>,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        ServiceProvider {
            connection_manager,
            location_service: Box::new(LocationService {}),
            master_list_service: Box::new(MasterListService {}),
            stock_take_service: Box::new(StockTakeService {}),
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
