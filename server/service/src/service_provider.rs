use repository::{
    Name, NameFilter, NameSort, PaginationOption, RepositoryError, StorageConnection,
    StorageConnectionManager, Store, StoreFilter, StoreSort,
};

use crate::{
    auth::{AuthService, AuthServiceTrait},
    dashboard::{
        invoice_count::{InvoiceCountService, InvoiceCountServiceTrait},
        stock_expiry_count::{StockExpiryCountServiceTrait, StockExpiryServiceCount},
    },
    document::{
        document_service::{DocumentService, DocumentServiceTrait},
        json_schema_service::{JsonSchemaService, JsonSchemaServiceTrait},
        patient::{PatientService, PatientServiceTrait},
    },
    invoice::{InvoiceService, InvoiceServiceTrait},
    invoice_line::{InvoiceLineService, InvoiceLineServiceTrait},
    item_stats::{ItemStatsService, ItemStatsServiceTrait},
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
    name::get_names,
    report::report_service::{ReportService, ReportServiceTrait},
    requisition::{RequisitionService, RequisitionServiceTrait},
    requisition_line::{RequisitionLineService, RequisitionLineServiceTrait},
    stocktake::{StocktakeService, StocktakeServiceTrait},
    stocktake_line::{StocktakeLineService, StocktakeLineServiceTrait},
    store::{get_store, get_stores},
    ListError, ListResult,
};

pub struct ServiceProvider {
    pub connection_manager: StorageConnectionManager,
    pub validation_service: Box<dyn AuthServiceTrait>,

    pub location_service: Box<dyn LocationServiceTrait>,
    pub invoice_service: Box<dyn InvoiceServiceTrait>,
    pub master_list_service: Box<dyn MasterListServiceTrait>,
    pub stocktake_service: Box<dyn StocktakeServiceTrait>,
    pub stocktake_line_service: Box<dyn StocktakeLineServiceTrait>,
    pub invoice_line_service: Box<dyn InvoiceLineServiceTrait>,
    pub requisition_service: Box<dyn RequisitionServiceTrait>,
    pub requisition_line_service: Box<dyn RequisitionLineServiceTrait>,
    pub general_service: Box<dyn GeneralServiceTrait>,
    // Dashboard:
    pub invoice_count_service: Box<dyn InvoiceCountServiceTrait>,
    pub stock_expiry_count_service: Box<dyn StockExpiryCountServiceTrait>,
    // Stock stats
    pub item_stats_service: Box<dyn ItemStatsServiceTrait>,

    // Reports
    pub report_service: Box<dyn ReportServiceTrait>,

    // Document
    pub document_service: Box<dyn DocumentServiceTrait>,
    pub schema_service: Box<dyn JsonSchemaServiceTrait>,
    pub patient_service: Box<dyn PatientServiceTrait>,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
}

impl ServiceProvider {
    pub fn new(connection_manager: StorageConnectionManager) -> Self {
        ServiceProvider {
            connection_manager: connection_manager.clone(),
            validation_service: Box::new(AuthService::new()),
            location_service: Box::new(LocationService {}),
            master_list_service: Box::new(MasterListService {}),
            invoice_line_service: Box::new(InvoiceLineService {}),
            invoice_count_service: Box::new(InvoiceCountService {}),
            invoice_service: Box::new(InvoiceService {}),
            stock_expiry_count_service: Box::new(StockExpiryServiceCount {}),
            stocktake_service: Box::new(StocktakeService {}),
            stocktake_line_service: Box::new(StocktakeLineService {}),
            requisition_service: Box::new(RequisitionService {}),
            requisition_line_service: Box::new(RequisitionLineService {}),
            item_stats_service: Box::new(ItemStatsService {}),
            general_service: Box::new(GeneralService {}),
            report_service: Box::new(ReportService {}),
            document_service: Box::new(DocumentService {}),
            schema_service: Box::new(JsonSchemaService {}),
            patient_service: Box::new(PatientService {}),
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

pub trait GeneralServiceTrait: Sync + Send {
    fn get_names(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<NameFilter>,
        sort: Option<NameSort>,
    ) -> Result<ListResult<Name>, ListError> {
        get_names(ctx, store_id, pagination, filter, sort)
    }

    fn get_stores(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<StoreFilter>,
        sort: Option<StoreSort>,
    ) -> Result<ListResult<Store>, ListError> {
        get_stores(ctx, pagination, filter, sort)
    }

    fn get_store(
        &self,
        ctx: &ServiceContext,
        filter: StoreFilter,
    ) -> Result<Option<Store>, RepositoryError> {
        get_store(ctx, filter)
    }
}

pub struct GeneralService;

impl GeneralServiceTrait for GeneralService {}
