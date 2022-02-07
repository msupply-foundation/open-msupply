use std::sync::Arc;

use repository::{RepositoryError, StorageConnection, StorageConnectionManager};

use crate::{
    dashboard::{
        invoice_count::{InvoiceCountService, InvoiceCountServiceTrait},
        stock_expiry_count::{StockExpiryCountServiceTrait, StockExpiryServiceCount},
    },
    invoice::{InvoiceService, InvoiceServiceTrait},
    invoice_line::{OutboundShipmentLineService, OutboundShipmentLineServiceTrait},
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
    permission_validation::{ValidationService, ValidationServiceTrait},
    permissions::{PermissionService, PermissionServiceTrait},
    requisition::{RequisitionService, RequisitionServiceTrait},
    stock_take::{StockTakeService, StockTakeServiceTrait},
    stock_take_line::{StockTakeLineService, StockTakeLineServiceTrait},
    store::{StoreService, StoreServiceTrait}, requisition_line::{RequisitionLineService, RequisitionLineServiceTrait},
};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub permission_service: Arc<dyn PermissionServiceTrait>,
    pub validation_service: Box<dyn ValidationServiceTrait>,

    pub location_service: Box<dyn LocationServiceTrait>,
    pub invoice_service: Box<dyn InvoiceServiceTrait>,
    pub master_list_service: Box<dyn MasterListServiceTrait>,
    pub stock_take_service: Box<dyn StockTakeServiceTrait>,
    pub stock_take_line_service: Box<dyn StockTakeLineServiceTrait>,
    pub store_service: Box<dyn StoreServiceTrait>,
    pub outbound_shipment_line: Box<dyn OutboundShipmentLineServiceTrait>,
    pub requisition_service: Box<dyn RequisitionServiceTrait>,
    pub requisition_line_service: Box<dyn RequisitionLineServiceTrait>,
    // Dashboard:
    pub invoice_count_service: Box<dyn InvoiceCountServiceTrait>,
    pub stock_expiry_count_service: Box<dyn StockExpiryCountServiceTrait>,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        let permission_service = Arc::new(PermissionService::new());
        ServiceProvider {
            connection_manager,
            permission_service: permission_service.clone(),
            validation_service: Box::new(ValidationService::new(permission_service)),
            location_service: Box::new(LocationService {}),
            master_list_service: Box::new(MasterListService {}),
            store_service: Box::new(StoreService {}),
            outbound_shipment_line: Box::new(OutboundShipmentLineService {}),
            invoice_count_service: Box::new(InvoiceCountService {}),
            invoice_service: Box::new(InvoiceService {}),
            stock_expiry_count_service: Box::new(StockExpiryServiceCount {}),
            stock_take_service: Box::new(StockTakeService {}),
            stock_take_line_service: Box::new(StockTakeLineService {}),
            requisition_service: Box::new(RequisitionService {}),
            requisition_line_service: Box::new(RequisitionLineService {}),
        }
    }

    /// Creates a new service context with a new DB connection
    pub fn context(&self) -> Result<ServiceContext, RepositoryError> {
        Ok(ServiceContext {
            connection: self.connection()?,
        })
    }

    /// Establishes a new DB connection
    pub fn connection(&self) -> Result<StorageConnection, RepositoryError> {
        self.connection_manager.connection()
    }
}
