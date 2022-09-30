use repository::{
    Name, NameFilter, NameSort, PaginationOption, RepositoryError, StorageConnection,
    StorageConnectionManager, Store, StoreFilter, StoreSort,
};

use crate::{
    app_data::{AppDataService, AppDataServiceTrait},
    auth::{AuthService, AuthServiceTrait},
    dashboard::{
        invoice_count::{InvoiceCountService, InvoiceCountServiceTrait},
        stock_expiry_count::{StockExpiryCountServiceTrait, StockExpiryServiceCount},
    },
    invoice::{InvoiceService, InvoiceServiceTrait},
    invoice_line::{InvoiceLineService, InvoiceLineServiceTrait},
    item_stats::{ItemStatsService, ItemStatsServiceTrait},
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
    name::get_names,
    processors::ProcessorsTrigger,
    report::report_service::{ReportService, ReportServiceTrait},
    requisition::{RequisitionService, RequisitionServiceTrait},
    requisition_line::{RequisitionLineService, RequisitionLineServiceTrait},
    settings_service::{SettingsService, SettingsServiceTrait},
    stocktake::{StocktakeService, StocktakeServiceTrait},
    stocktake_line::{StocktakeLineService, StocktakeLineServiceTrait},
    store::{get_store, get_stores},
    sync::{
        site_info::{SiteInfoService, SiteInfoTrait},
        sync_status::status::{SyncStatusService, SyncStatusTrait},
    },
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
    // Settings
    pub settings: Box<dyn SettingsServiceTrait>,
    // App Data Service
    pub app_data_service: Box<dyn AppDataServiceTrait>,
    // Sync
    pub site_info_service: Box<dyn SiteInfoTrait>,
    pub sync_status_service: Box<dyn SyncStatusTrait>,
    // Triggers
    processors_trigger: ProcessorsTrigger,
}

pub struct ServiceContext {
    pub connection: StorageConnection,
    pub(crate) processors_trigger: ProcessorsTrigger,
    pub user_id: String,
    pub store_id: String,
}

impl ServiceProvider {
    // TODO we should really use `new` with processors_trigger, we constructs ServiceProvider manually in tests though
    // and it would be a bit of refactor, ideally setup_all and setup_all_with_data will return an instance of ServiceProvider
    // {make an issue}
    pub fn new(connection_manager: StorageConnectionManager, app_data_folder: &str) -> Self {
        ServiceProvider::new_with_processors(
            connection_manager,
            app_data_folder,
            ProcessorsTrigger::new_void(),
        )
    }

    pub fn new_with_processors(
        connection_manager: StorageConnectionManager,
        app_data_folder: &str,
        processors_trigger: ProcessorsTrigger,
    ) -> Self {
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
            settings: Box::new(SettingsService {}),
            app_data_service: Box::new(AppDataService::new(app_data_folder)),
            site_info_service: Box::new(SiteInfoService),
            sync_status_service: Box::new(SyncStatusService),
            processors_trigger,
        }
    }

    /// Creates a new service context with a new DB connection
    pub fn basic_context(&self) -> Result<ServiceContext, RepositoryError> {
        Ok(ServiceContext {
            connection: self.connection()?,
            processors_trigger: self.processors_trigger.clone(),
            user_id: "".to_string(),
            store_id: "".to_string(),
        })
    }

    pub fn context(
        &self,
        store_id: String,
        user_id: String,
    ) -> Result<ServiceContext, RepositoryError> {
        Ok(ServiceContext {
            connection: self.connection()?,
            processors_trigger: self.processors_trigger.clone(),
            user_id: user_id,
            store_id: store_id,
        })
    }

    /// Establishes a new DB connection
    pub fn connection(&self) -> Result<StorageConnection, RepositoryError> {
        self.connection_manager.connection()
    }
}

impl ServiceContext {
    #[cfg(test)]
    pub(crate) fn new_without_processors(connection: StorageConnection) -> ServiceContext {
        ServiceContext {
            connection,
            processors_trigger: ProcessorsTrigger::new_void(),
            user_id: "".to_string(),
            store_id: "".to_string(),
        }
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
