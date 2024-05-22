#[cfg(test)]
mod tests;

use std::sync::Mutex;

use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use actix_web::{guard, HttpRequest};

use async_graphql::{EmptyMutation, EmptySubscription, Object, Schema};
use async_graphql::{MergedObject, Response};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use graphql_batch_mutations::BatchMutations;
use graphql_clinician::ClinicianQueries;
use graphql_core::loader::LoaderRegistry;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{auth_data_from_request, BoxedSelfRequest, RequestUserData, SelfRequest};
use graphql_form_schema::{FormSchemaMutations, FormSchemaQueries};
use graphql_general::{
    DiscoveryQueries, GeneralMutations, GeneralQueries, InitialisationMutations,
    InitialisationQueries,
};

use graphql_asset::{
    AssetLogMutations, AssetLogQueries, AssetLogReasonMutations, AssetLogReasonQueries,
    AssetMutations, AssetQueries,
};
use graphql_asset_catalogue::AssetCatalogueMutations;
use graphql_asset_catalogue::AssetCatalogueQueries;
use graphql_cold_chain::{ColdChainMutations, ColdChainQueries};
use graphql_demographic::DemographicIndicatorQueries;
use graphql_inventory_adjustment::InventoryAdjustmentMutations;
use graphql_invoice::{InvoiceMutations, InvoiceQueries};
use graphql_invoice_line::{InvoiceLineMutations, InvoiceLineQueries};
use graphql_location::{LocationMutations, LocationQueries};
use graphql_pack_variant::{PackVariantMutations, PackVariantQueries};
use graphql_plugin::{PluginMutations, PluginQueries};
use graphql_programs::{ProgramsMutations, ProgramsQueries};
use graphql_repack::{RepackMutations, RepackQueries};
use graphql_reports::ReportQueries;
use graphql_requisition::{RequisitionMutations, RequisitionQueries};
use graphql_requisition_line::RequisitionLineMutations;
use graphql_stock_line::{StockLineMutations, StockLineQueries};
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::{StocktakeLineMutations, StocktakeLineQueries};

use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::sync::CentralServerConfig;
use tokio::sync::RwLock;

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
    async fn pack_variant(&self) -> PackVariantMutations {
        PackVariantMutations
    }
    async fn asset_catalogue(&self) -> AssetCatalogueMutations {
        AssetCatalogueMutations
    }
    async fn log_reason(&self) -> AssetLogReasonMutations {
        AssetLogReasonMutations
    }
}

#[derive(Default, Clone)]
pub struct CentralServerMutations;
#[Object]
impl CentralServerMutations {
    async fn central_server(&self) -> async_graphql::Result<CentralServerMutationNode> {
        if !CentralServerConfig::is_central_server() {
            return Err(StandardGraphqlError::from_str("Not a central server"));
        };

        Ok(CentralServerMutationNode)
    }
}

#[derive(MergedObject, Default, Clone)]
pub struct Queries(
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
    pub ProgramsQueries,
    pub FormSchemaQueries,
    pub ClinicianQueries,
    pub PackVariantQueries,
    pub PluginQueries,
    pub AssetCatalogueQueries,
    pub AssetQueries,
    pub AssetLogQueries,
    pub AssetLogReasonQueries,
    pub DemographicIndicatorQueries,
);

impl Queries {
    pub fn new() -> Queries {
        Queries(
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
            ProgramsQueries,
            FormSchemaQueries,
            ClinicianQueries,
            PackVariantQueries,
            PluginQueries,
            AssetCatalogueQueries,
            AssetQueries,
            AssetLogQueries,
            AssetLogReasonQueries,
            DemographicIndicatorQueries,
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
    pub GeneralMutations,
    pub ProgramsMutations,
    pub FormSchemaMutations,
    pub PluginMutations,
    pub ColdChainMutations,
    pub CentralServerMutations,
    pub AssetMutations,
    pub AssetLogMutations,
    pub InventoryAdjustmentMutations,
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
            GeneralMutations,
            ProgramsMutations,
            FormSchemaMutations,
            PluginMutations,
            ColdChainMutations,
            CentralServerMutations,
            AssetMutations,
            AssetLogMutations,
            InventoryAdjustmentMutations,
        )
    }
}

/// We need to swap schema between initialisation and operational modes
/// this is done to avoid validations check in operational mode where
/// data for validation is not available, this struct helps achieve this
pub struct GraphqlSchema {
    operational: OperationalSchema,
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
                .data(Data::new(SelfRequestImpl::new_boxed(self_requester_schema)));

        // Initialisation schema should ony need service_provider
        let initialisiation_builder = InitialisationSchema::build(
            InitialisationQueries,
            InitialisationMutations,
            EmptySubscription,
        )
        .data(service_provider.clone());

        GraphqlSchema {
            operational: operational_builder.finish(),
            initialisation: initialisiation_builder.finish(),
            is_operational: RwLock::new(is_operational),
        }
    }

    pub async fn toggle_is_operational(&self, is_operational: bool) {
        (*self.is_operational.write().await) = is_operational;
    }

    async fn execute(&self, http_req: HttpRequest, req: GraphQLRequest) -> Response {
        let req = req.into_inner();
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
