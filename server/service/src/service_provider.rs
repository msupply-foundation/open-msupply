use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::{
    dashboard::{
        invoice_count::{InvoiceCountService, InvoiceCountServiceTrait},
        stock_expiry_count::{StockExpiryCountServiceTrait, StockExpiryServiceCount},
    },
    invoice_line::{OutboundShipmentLineService, OutboundShipmentLineServiceTrait},
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub location_service: Box<dyn LocationServiceTrait>,
    pub master_list_service: Box<dyn MasterListServiceTrait>,
    pub outbound_shipment_line: Box<dyn OutboundShipmentLineServiceTrait>,
    // Dashboard:
    pub invoice_count_service: Box<dyn InvoiceCountServiceTrait>,
    pub stock_expiry_count_service: Box<dyn StockExpiryCountServiceTrait>,
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
            outbound_shipment_line: Box::new(OutboundShipmentLineService {}),
            invoice_count_service: Box::new(InvoiceCountService {}),
            stock_expiry_count_service: Box::new(StockExpiryServiceCount {}),
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
