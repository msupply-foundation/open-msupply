#![recursion_limit = "256"]

mod logger;

use logger::{GraphQLRequestLogger, QueryLogInfo};

use std::sync::Mutex;
use tokio::sync::RwLock;

use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use actix_web::{guard, HttpRequest};

use async_graphql::{EmptyMutation, EmptySubscription, Object, Schema};
use async_graphql::{MergedObject, Response};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};

use graphql_asset::property::AssetPropertiesQueries;
use graphql_asset::{
    logs::{AssetLogMutations, AssetLogQueries, AssetLogReasonMutations, AssetLogReasonQueries},
    AssetMutations, AssetQueries,
};
use graphql_asset_catalogue::AssetCatalogueMutations;
use graphql_asset_catalogue::AssetCatalogueQueries;
use graphql_batch_mutations::BatchMutations;
use graphql_clinician::{ClinicianMutations, ClinicianQueries};
use graphql_cold_chain::{ColdChainMutations, ColdChainQueries};
use graphql_contact::ContactQueries;
use graphql_contact_form::ContactFormMutations;
use graphql_core::loader::LoaderRegistry;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{auth_data_from_request, BoxedSelfRequest, RequestUserData, SelfRequest};
use graphql_demographic::{DemographicIndicatorQueries, DemographicMutations};
use graphql_form_schema::{FormSchemaMutations, FormSchemaQueries};
use graphql_general::campaign::{CampaignMutations, CampaignQueries};
use graphql_general::{
    CentralGeneralMutations, DiscoveryQueries, GeneralMutations, GeneralQueries,
    InitialisationMutations, InitialisationQueries,
};
use graphql_goods_received::{GoodsReceivedMutations, GoodsReceivedQueries};
use graphql_goods_received_line::{GoodsReceivedLineMutations, GoodsReceivedLineQueries};
use graphql_inventory_adjustment::InventoryAdjustmentMutations;
use graphql_invoice::{InvoiceMutations, InvoiceQueries};
use graphql_invoice_line::{InvoiceLineMutations, InvoiceLineQueries};
use graphql_item_bundle::BundledItemMutations;
use graphql_item_variant::{ItemVariantMutations, ItemVariantQueries};
use graphql_location::{LocationMutations, LocationQueries};
use graphql_plugin::{
    CentralPluginMutations, CentralPluginQueries, PluginMutations, PluginQueries,
};
use graphql_preference::{PreferenceMutations, PreferenceQueries};
use graphql_printer::{PrinterMutations, PrinterQueries};
use graphql_programs::{ProgramsMutations, ProgramsQueries};
use graphql_purchase_order::{PurchaseOrderMutations, PurchaseOrderQueries};
use graphql_purchase_order_line::{PurchaseOrderLineMutations, PurchaseOrderLineQueries};
use graphql_repack::{RepackMutations, RepackQueries};
use graphql_reports::{CentralReportMutations, ReportQueries};
use graphql_requisition::{RequisitionMutations, RequisitionQueries};
use graphql_requisition_line::RequisitionLineMutations;
use graphql_stock_line::{StockLineMutations, StockLineQueries};
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::{StocktakeLineMutations, StocktakeLineQueries};
use graphql_vaccine_course::{VaccineCourseMutations, VaccineCourseQueries};
use graphql_vvm::{VVMMutations, VVMQueries};

use repository::StorageConnectionManager;

use service::auth_data::AuthData;
use service::boajs::utils::{ExecuteGraphQlError, ExecuteGraphql};
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::sync::CentralServerConfig;

pub type OperationalSchema =
    async_graphql::Schema<Queries, Mutations, async_graphql::EmptySubscription>;
pub type InitialisationSchema = async_graphql::Schema<
    InitialisationQueries,
    InitialisationMutations,
    async_graphql::EmptySubscription,
>;
#[derive(Default, Clone)]
pub struct CentralServerMutationNode;
#[Object]
impl CentralServerMutationNode {
    async fn item_variant(&self) -> ItemVariantMutations {
        ItemVariantMutations
    }
    async fn bundled_item(&self) -> BundledItemMutations {
        BundledItemMutations
    }
    async fn asset_catalogue(&self) -> AssetCatalogueMutations {
        AssetCatalogueMutations
    }
    async fn log_reason(&self) -> AssetLogReasonMutations {
        AssetLogReasonMutations
    }
    async fn demographic(&self) -> DemographicMutations {
        DemographicMutations
    }
    async fn vaccine_course(&self) -> VaccineCourseMutations {
        VaccineCourseMutations
    }

    async fn general(&self) -> CentralGeneralMutations {
        CentralGeneralMutations
    }

    async fn plugins(&self) -> CentralPluginMutations {
        CentralPluginMutations
    }

    async fn preferences(&self) -> PreferenceMutations {
        PreferenceMutations
    }

    async fn campaign(&self) -> CampaignMutations {
        CampaignMutations
    }

    async fn reports(&self) -> CentralReportMutations {
        CentralReportMutations
    }
}

#[derive(Default, Clone)]
pub struct CentralServerQueryNode;
#[Object]
impl CentralServerQueryNode {
    async fn plugin(&self) -> CentralPluginQueries {
        CentralPluginQueries
    }
}

#[derive(Default, Clone)]
pub struct CentralServerMutations;
#[Object]
impl CentralServerMutations {
    async fn central_server(&self) -> async_graphql::Result<CentralServerMutationNode> {
        if !CentralServerConfig::is_central_server() {
            return Err(StandardGraphqlError::from_str_slice("Not a central server"));
        };

        Ok(CentralServerMutationNode)
    }
}

#[derive(Default, Clone)]
pub struct CentralServerQueries;
#[Object]
impl CentralServerQueries {
    async fn central_server(&self) -> async_graphql::Result<CentralServerQueryNode> {
        if !CentralServerConfig::is_central_server() {
            return Err(StandardGraphqlError::from_str_slice("Not a central server"));
        };

        Ok(CentralServerQueryNode)
    }
}
#[derive(MergedObject, Default, Clone)]
pub struct Queries(
    pub ContactQueries,
    pub InvoiceQueries,
    pub InvoiceLineQueries,
    pub LocationQueries,
    pub ColdChainQueries,
    pub StocktakeQueries,
    pub StocktakeLineQueries,
    pub GeneralQueries,
    pub RequisitionQueries,
    pub ReportQueries,
    pub StockLineQueries,
    pub RepackQueries,
    pub PrinterQueries,
    pub ProgramsQueries,
    pub FormSchemaQueries,
    pub ClinicianQueries,
    pub PluginQueries,
    pub AssetCatalogueQueries,
    pub AssetQueries,
    pub AssetLogQueries,
    pub AssetLogReasonQueries,
    pub AssetPropertiesQueries,
    pub DemographicIndicatorQueries,
    pub VaccineCourseQueries,
    pub ItemVariantQueries,
    pub PreferenceQueries,
    pub CentralServerQueries,
    pub VVMQueries,
    pub CampaignQueries,
    pub PurchaseOrderQueries,
    pub PurchaseOrderLineQueries,
    pub GoodsReceivedQueries,
    pub GoodsReceivedLineQueries,
);

impl Queries {
    pub fn new() -> Queries {
        Queries(
            ContactQueries,
            InvoiceQueries,
            InvoiceLineQueries,
            LocationQueries,
            ColdChainQueries,
            StocktakeQueries,
            StocktakeLineQueries,
            GeneralQueries,
            RequisitionQueries,
            ReportQueries,
            StockLineQueries,
            RepackQueries,
            PrinterQueries,
            ProgramsQueries,
            FormSchemaQueries,
            ClinicianQueries,
            PluginQueries,
            AssetCatalogueQueries,
            AssetQueries,
            AssetLogQueries,
            AssetLogReasonQueries,
            AssetPropertiesQueries,
            DemographicIndicatorQueries,
            VaccineCourseQueries,
            ItemVariantQueries,
            PreferenceQueries,
            CentralServerQueries,
            VVMQueries,
            CampaignQueries,
            PurchaseOrderQueries,
            PurchaseOrderLineQueries,
            GoodsReceivedQueries,
            GoodsReceivedLineQueries,
        )
    }
}

#[derive(MergedObject, Default, Clone)]
pub struct Mutations(
    pub InvoiceMutations,
    pub InvoiceLineMutations,
    pub LocationMutations,
    pub StocktakeMutations,
    pub StocktakeLineMutations,
    pub BatchMutations,
    pub RequisitionMutations,
    pub RequisitionLineMutations,
    pub StockLineMutations,
    pub RepackMutations,
    pub PrinterMutations,
    pub GeneralMutations,
    pub ProgramsMutations,
    pub FormSchemaMutations,
    pub PluginMutations,
    pub ColdChainMutations,
    pub CentralServerMutations,
    pub AssetMutations,
    pub AssetLogMutations,
    pub InventoryAdjustmentMutations,
    pub ContactFormMutations,
    pub VVMMutations,
    pub ClinicianMutations,
    pub PurchaseOrderMutations,
    pub PurchaseOrderLineMutations,
    pub GoodsReceivedMutations,
    pub GoodsReceivedLineMutations,
);

impl Mutations {
    pub fn new() -> Mutations {
        Mutations(
            InvoiceMutations,
            InvoiceLineMutations,
            LocationMutations,
            StocktakeMutations,
            StocktakeLineMutations,
            BatchMutations,
            RequisitionMutations,
            RequisitionLineMutations,
            StockLineMutations,
            RepackMutations,
            PrinterMutations,
            GeneralMutations,
            ProgramsMutations,
            FormSchemaMutations,
            PluginMutations,
            ColdChainMutations,
            CentralServerMutations,
            AssetMutations,
            AssetLogMutations,
            InventoryAdjustmentMutations,
            ContactFormMutations,
            VVMMutations,
            ClinicianMutations,
            PurchaseOrderMutations,
            PurchaseOrderLineMutations,
            GoodsReceivedMutations,
            GoodsReceivedLineMutations,
        )
    }
}

/// We need to swap schema between initialisation and operational modes
/// this is done to avoid validations check in operational mode where
/// data for validation is not available, this struct helps achieve this
pub struct GraphqlSchema {
    pub(crate) operational: OperationalSchema,
    initialisation: InitialisationSchema,
    /// Set on startup based on InitialisationStatus and then updated via SiteIsInitialisedCallback after initialisation
    is_operational: RwLock<bool>,
}

pub struct GraphSchemaData {
    pub connection_manager: Data<StorageConnectionManager>,
    pub loader_registry: Data<LoaderRegistry>,
    pub service_provider: Data<ServiceProvider>,
    pub auth: Data<AuthData>,
    pub settings: Data<Settings>,
    pub validated_plugins: Data<Mutex<ValidatedPluginBucket>>,
}

impl GraphqlSchema {
    pub fn new(data: GraphSchemaData, is_operational: bool) -> GraphqlSchema {
        let GraphSchemaData {
            connection_manager,
            loader_registry,
            service_provider,
            auth,
            settings,
            validated_plugins,
        } = data;

        // Self requester schema is a copy of operational schema, used for reports
        // needs to be available as data in operational schema
        let self_requester_schema =
            OperationalSchema::build(Queries::new(), Mutations::new(), EmptySubscription)
                .data(connection_manager.clone())
                .data(loader_registry.clone())
                .data(service_provider.clone())
                .data(auth.clone())
                .data(settings.clone())
                .data(validated_plugins.clone())
                .extension(GraphQLRequestLogger)
                .finish();
        // Self requester does not need loggers

        // Operational schema
        let operational_builder =
            OperationalSchema::build(Queries::new(), Mutations::new(), EmptySubscription)
                .data(connection_manager.clone())
                .data(loader_registry.clone())
                .data(service_provider.clone())
                .data(auth.clone())
                .data(settings.clone())
                .data(validated_plugins.clone())
                // Add self requester to operational
                .data(Data::new(SelfRequestImpl::new_boxed(self_requester_schema)))
                .extension(GraphQLRequestLogger);

        // Initialisation schema should ony need service_provider
        let initialisation_builder = InitialisationSchema::build(
            InitialisationQueries,
            InitialisationMutations,
            EmptySubscription,
        )
        .data(service_provider.clone())
        .extension(GraphQLRequestLogger);

        GraphqlSchema {
            operational: operational_builder.finish(),
            initialisation: initialisation_builder.finish(),
            is_operational: RwLock::new(is_operational),
        }
    }

    pub async fn toggle_is_operational(&self, is_operational: bool) {
        (*self.is_operational.write().await) = is_operational;
    }

    async fn execute(&self, http_req: HttpRequest, req: GraphQLRequest) -> Response {
        let mut req = req.into_inner();
        req = req.data(QueryLogInfo::new());

        if *self.is_operational.read().await {
            // auth_data is only available in schema in operational mode
            let user_data = auth_data_from_request(&http_req);
            self.operational.execute(req.data(user_data)).await
        } else {
            self.initialisation.execute(req).await
        }
    }
}

pub fn attach_graphql_schema(
    graphql_schema: Data<GraphqlSchema>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        cfg.app_data(graphql_schema)
            .service(
                web::resource("/graphql")
                    .guard(guard::Post())
                    .to(graphql_index),
            )
            .service(
                web::resource("/graphql")
                    .guard(guard::Get())
                    .to(graphql_playground),
            );
    }
}

/// Entrypoint for graphql
async fn graphql_index(
    schema: Data<GraphqlSchema>,
    http_req: HttpRequest,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(http_req, req).await.into()
}

async fn graphql_playground() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(include_str!("playground.html"))
}

// TODO remove this and just do reqwest query to self
/// Used for reports

struct SelfRequestImpl {
    schema: OperationalSchema,
}

impl SelfRequestImpl {
    fn new_boxed(schema: Schema<Queries, Mutations, EmptySubscription>) -> BoxedSelfRequest {
        Box::new(SelfRequestImpl { schema })
    }
}

#[async_trait::async_trait]
impl SelfRequest for SelfRequestImpl {
    async fn call(
        &self,
        request: async_graphql::Request,
        user_data: RequestUserData,
    ) -> async_graphql::Response {
        let query = request.data(user_data);
        self.schema.execute(query).await
    }
}

/// During server discovery we display initialisation status and site name
/// this needs to be queried from the server, to avoid self certificate and cors
/// issues a separate http graphql server is launched with just DiscoveryQueries
pub type DiscoverySchema =
    async_graphql::Schema<DiscoveryQueries, EmptyMutation, EmptySubscription>;

pub fn attach_discovery_graphql_schema(
    service_provider: Data<ServiceProvider>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        cfg.app_data(Data::new(
            DiscoverySchema::build(DiscoveryQueries, EmptyMutation, EmptySubscription)
                .data(service_provider)
                .finish(),
        ))
        .service(
            web::resource("/graphql")
                .guard(guard::Post())
                .to(discovery_index),
        );
    }
}

async fn discovery_index(schema: Data<DiscoverySchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

pub struct PluginExecuteGraphql(pub Data<GraphqlSchema>);

#[async_trait::async_trait]
impl ExecuteGraphql for PluginExecuteGraphql {
    async fn execute_graphql(
        &self,
        override_user_id: &str,
        query: &str,
        variables: serde_json::Value,
    ) -> Result<serde_json::Value, ExecuteGraphQlError> {
        let request = async_graphql::Request::new(query)
            .variables(serde_json::from_value(variables)?)
            .data(RequestUserData {
                override_user_id: Some(override_user_id.to_string()),
                auth_token: None,
                refresh_token: None,
            });
        let response = self.0.operational.execute(request).await;
        // Response is either success with data field populated or error with errors field populated
        if response.is_err() {
            return Err(ExecuteGraphQlError::Graphql(serde_json::to_string(
                &response.errors,
            )?));
        }

        Ok(serde_json::to_value(response.data)?)
    }
}
