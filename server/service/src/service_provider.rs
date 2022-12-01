use crate::{
    app_data::{AppDataService, AppDataServiceTrait},
    auth::{AuthService, AuthServiceTrait},
    dashboard::{
        invoice_count::{InvoiceCountService, InvoiceCountServiceTrait},
        stock_expiry_count::{StockExpiryCountServiceTrait, StockExpiryServiceCount},
    },
    display_settings_service::{DisplaySettingsService, DisplaySettingsServiceTrait},
    document::{
        document_registry::{DocumentRegistryService, DocumentRegistryServiceTrait},
        document_service::{DocumentService, DocumentServiceTrait},
        form_schema_service::{FormSchemaService, FormSchemaServiceTrait},
    },
    invoice::{InvoiceService, InvoiceServiceTrait},
    invoice_line::{InvoiceLineService, InvoiceLineServiceTrait},
    item_stats::{ItemStatsService, ItemStatsServiceTrait},
    location::{LocationService, LocationServiceTrait},
    master_list::{MasterListService, MasterListServiceTrait},
    name::get_names,
    processors::ProcessorsTrigger,
    programs::{
        encounter::{EncounterService, EncounterServiceTrait},
        patient::{PatientService, PatientServiceTrait},
        program_enrolment::{ProgramEnrolmentService, ProgramEnrolmentServiceTrait},
        program_event::{ProgramEventService, ProgramEventServiceTrait},
    },
    report::report_service::{ReportService, ReportServiceTrait},
    requisition::{RequisitionService, RequisitionServiceTrait},
    requisition_line::{RequisitionLineService, RequisitionLineServiceTrait},
    settings_service::{SettingsService, SettingsServiceTrait},
    stock_line::{StockLineService, StockLineServiceTrait},
    stocktake::{StocktakeService, StocktakeServiceTrait},
    stocktake_line::{StocktakeLineService, StocktakeLineServiceTrait},
    store::{get_store, get_stores},
    sync::{
        site_info::{SiteInfoService, SiteInfoTrait},
        sync_status::status::{SyncStatusService, SyncStatusTrait},
        synchroniser_driver::{SiteIsInitialisedTrigger, SyncTrigger},
    },
    system_user::create_system_user,
    ListError, ListResult,
};
use repository::{
    Name, NameFilter, NameSort, PaginationOption, RepositoryError, StorageConnection,
    StorageConnectionManager, Store, StoreFilter, StoreSort,
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
    // Stock
    pub stock_line_service: Box<dyn StockLineServiceTrait>,
    // Reports
    pub report_service: Box<dyn ReportServiceTrait>,

    // Document
    pub document_service: Box<dyn DocumentServiceTrait>,
    pub document_registry_service: Box<dyn DocumentRegistryServiceTrait>,
    pub form_schema_service: Box<dyn FormSchemaServiceTrait>,
    pub patient_service: Box<dyn PatientServiceTrait>,
    pub program_enrolment_service: Box<dyn ProgramEnrolmentServiceTrait>,
    pub encounter_service: Box<dyn EncounterServiceTrait>,
    pub program_event_service: Box<dyn ProgramEventServiceTrait>,

    // Settings
    pub settings: Box<dyn SettingsServiceTrait>,
    // App Data Service
    pub app_data_service: Box<dyn AppDataServiceTrait>,
    // Sync
    pub site_info_service: Box<dyn SiteInfoTrait>,
    pub sync_status_service: Box<dyn SyncStatusTrait>,
    // Triggers
    processors_trigger: ProcessorsTrigger,
    pub sync_trigger: SyncTrigger,
    pub site_is_initialised_trigger: SiteIsInitialisedTrigger,
    pub display_settings_service: Box<dyn DisplaySettingsServiceTrait>,
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
        ServiceProvider::new_with_triggers(
            connection_manager,
            app_data_folder,
            ProcessorsTrigger::new_void(),
            SyncTrigger::new_void(),
            SiteIsInitialisedTrigger::new_void(),
        )
    }

    pub fn new_with_triggers(
        connection_manager: StorageConnectionManager,
        app_data_folder: &str,
        processors_trigger: ProcessorsTrigger,
        sync_trigger: SyncTrigger,
        site_is_initialised_trigger: SiteIsInitialisedTrigger,
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
            document_service: Box::new(DocumentService {}),
            document_registry_service: Box::new(DocumentRegistryService {}),
            form_schema_service: Box::new(FormSchemaService {}),
            patient_service: Box::new(PatientService {}),
            program_enrolment_service: Box::new(ProgramEnrolmentService {}),
            program_event_service: Box::new(ProgramEventService {}),
            encounter_service: Box::new(EncounterService {}),
            settings: Box::new(SettingsService {}),
            app_data_service: Box::new(AppDataService::new(app_data_folder)),
            site_info_service: Box::new(SiteInfoService),
            sync_status_service: Box::new(SyncStatusService),
            processors_trigger,
            sync_trigger,
            site_is_initialised_trigger,
            display_settings_service: Box::new(DisplaySettingsService {}),
            stock_line_service: Box::new(StockLineService {}),
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
            user_id,
            store_id,
        })
    }

    /// Establishes a new DB connection
    pub fn connection(&self) -> Result<StorageConnection, RepositoryError> {
        self.connection_manager.connection()
    }
}

impl ServiceContext {
    #[cfg(test)]
    pub(crate) fn new_without_triggers(connection: StorageConnection) -> ServiceContext {
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

    fn create_system_user(
        &self,
        service_provider: &ServiceProvider,
    ) -> Result<(), RepositoryError> {
        create_system_user(service_provider)
    }
}

pub struct GeneralService;

impl GeneralServiceTrait for GeneralService {}
