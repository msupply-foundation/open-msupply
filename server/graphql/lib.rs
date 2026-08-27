#![recursion_limit = "256"]

mod logger;

use logger::{GraphQLRequestLogger, QueryLogInfo};

use std::sync::Mutex;
use tokio::sync::RwLock;

pub use graphql_core::OperationalStatus;

use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use actix_web::{guard, HttpRequest};

use async_graphql::{
    EmptyMutation, EmptySubscription, MergedSubscription, Object, ObjectType, Schema,
    SchemaBuilder, Subscription, SubscriptionType,
};
use async_graphql::{MergedObject, Response};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};

use graphql_ancillary_item::AncillaryItemMutations;
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
use graphql_general::custom_field::{CustomFieldConfigQueries, CustomFieldMutations};
use graphql_general::help_document::{HelpDocumentMutations, HelpDocumentQueries};
use graphql_general::{
    CentralGeneralMutations, DiscoveryQueries, GeneralMutations, GeneralQueries,
    InitialisationMutations, InitialisationQueries, InitialisationSubscriptions, MigrationQueries,
    SyncStatusSubscriptions,
};
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
use graphql_site::{CentralSiteMutations, CentralSiteQueries};
use graphql_stock_line::{StockLineMutations, StockLineQueries};
use graphql_stock_relocation::{StockRelocationMutations, StockRelocationQueries};
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::{StocktakeLineMutations, StocktakeLineQueries};
use graphql_sync_message::{SyncMessageMutations, SyncMessageQueries};
use graphql_vaccine_course::{VaccineCourseMutations, VaccineCourseQueries};
use graphql_vvm::{VVMMutations, VVMQueries};

use repository::StorageConnectionManager;

use futures::stream::Stream;
use tokio::sync::broadcast;

use service::auth_data::AuthData;
use service::boajs::utils::{ExecuteGraphQlError, ExecuteGraphql};
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use service::subscription::ResolvedSubscription;
use service::sync::CentralServerConfig;

pub type OperationalSchema = async_graphql::Schema<Queries, Mutations, Subscriptions>;
pub type InitialisationSchema = async_graphql::Schema<
    InitialisationQueries,
    InitialisationMutations,
    InitialisationSubscriptions,
>;
pub type MigrationSchema =
    async_graphql::Schema<MigrationQueries, EmptyMutation, async_graphql::EmptySubscription>;

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
    async fn ancillary_item(&self) -> AncillaryItemMutations {
        AncillaryItemMutations
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

    async fn help_document(&self) -> HelpDocumentMutations {
        HelpDocumentMutations
    }

    async fn custom_field(&self) -> CustomFieldMutations {
        CustomFieldMutations
    }

    async fn reports(&self) -> CentralReportMutations {
        CentralReportMutations
    }

    async fn site(&self) -> CentralSiteMutations {
        CentralSiteMutations
    }
}

#[derive(Default, Clone)]
pub struct CentralServerQueryNode;
#[Object]
impl CentralServerQueryNode {
    async fn plugin(&self) -> CentralPluginQueries {
        CentralPluginQueries
    }

    async fn sync_message(&self) -> SyncMessageQueries {
        SyncMessageQueries
    }

    async fn site(&self) -> CentralSiteQueries {
        CentralSiteQueries
    }

    async fn custom_field(&self) -> CustomFieldConfigQueries {
        CustomFieldConfigQueries
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
    pub StockRelocationQueries,
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
    pub HelpDocumentQueries,
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
            StockRelocationQueries,
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
            HelpDocumentQueries,
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
    pub StockRelocationMutations,
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
    pub SyncMessageMutations,
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
            StockRelocationMutations,
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
            SyncMessageMutations,
        )
    }
}

#[derive(Default, Clone)]
pub struct BaseSubscriptions;

#[Subscription]
impl BaseSubscriptions {
    /// Simple subscription to verify WebSocket connectivity
    async fn ping(&self) -> impl Stream<Item = String> {
        futures::stream::once(async { "pong".to_string() })
    }
}

#[derive(MergedSubscription, Default, Clone)]
pub struct Subscriptions(pub BaseSubscriptions, pub SyncStatusSubscriptions);

/// Upper bound on GraphQL query nesting depth. Without it, an authenticated
/// low-privilege user (or any pre-login query path) can submit a degenerate
/// nested query and amplify CPU/DB work per request — a cheap DoS on the
/// low-powered hardware site servers often run on (finding F-2, issue #362).
/// 50 is comfortably above the deepest query measured anywhere: 8 in `client/`,
/// 6 in `frontend/`, 11 in the customer reports repo.
const MAX_QUERY_DEPTH: usize = 50;

/// Upper bound on GraphQL query complexity (async-graphql's field-count
/// metric, `1 + child_complexity` per field, no custom `#[graphql(complexity)]`
/// anywhere). Same DoS-amplifier rationale as depth; caps very wide queries
/// that stay shallow but fan out. 800 gives ~3x headroom over the most expensive
/// query measured anywhere (`itemById` in `client/`, complexity 255), and covers
/// implementer-authored custom reports, which run through the self-requester
/// schema (see `server/graphql/reports/src/print.rs`) and so share this ceiling —
/// the 82 reports in `msupply-foundation/open-msupply-reports` peak at 83. Raise
/// the constant if a legitimate query is ever rejected; do not remove the limit.
/// `shipped_report_queries_are_within_cost_limits` guards the report side.
const MAX_QUERY_COMPLEXITY: usize = 800;

fn with_cost_limits<Q, M, S>(builder: SchemaBuilder<Q, M, S>) -> SchemaBuilder<Q, M, S>
where
    Q: ObjectType + 'static,
    M: ObjectType + 'static,
    S: SubscriptionType + 'static,
{
    builder
        .limit_depth(MAX_QUERY_DEPTH)
        .limit_complexity(MAX_QUERY_COMPLEXITY)
}

/// We need to swap schema between initialisation and operational modes
/// this is done to avoid validations check in operational mode where
/// data for validation is not available, this struct helps achieve this
pub struct GraphqlSchema {
    pub(crate) operational: OperationalSchema,
    initialisation: InitialisationSchema,
    migration: MigrationSchema,
    /// Set on startup based on InitialisationStatus and then updated via SiteIsInitialisedCallback after initialisation
    operational_status: Data<RwLock<OperationalStatus>>,
    /// Copy of [`service::auth_data::AuthData::cookie_suffix`] so `auth_data_from_request` can
    /// look up the right cookie name without reaching into the schema's data map.
    cookie_suffix: String,
}

pub struct GraphSchemaData {
    pub connection_manager: Data<StorageConnectionManager>,
    pub loader_registry: Data<LoaderRegistry>,
    pub service_provider: Data<ServiceProvider>,
    pub auth: Data<AuthData>,
    pub settings: Data<Settings>,
    pub validated_plugins: Data<Mutex<ValidatedPluginBucket>>,
    pub subscription_broadcast: broadcast::Sender<ResolvedSubscription>,
}

impl GraphqlSchema {
    pub fn new(data: GraphSchemaData, operational_status: OperationalStatus) -> GraphqlSchema {
        let GraphSchemaData {
            connection_manager,
            loader_registry,
            service_provider,
            auth,
            settings,
            validated_plugins,
            subscription_broadcast,
        } = data;
        let cookie_suffix = auth.cookie_suffix.clone();
        let subscription_broadcast = Data::new(subscription_broadcast);

        // Self requester schema is a copy of operational schema, used for reports
        // needs to be available as data in operational schema
        let self_requester_schema = with_cost_limits(OperationalSchema::build(
            Queries::new(),
            Mutations::new(),
            Subscriptions::default(),
        ))
        .data(connection_manager.clone())
        .data(loader_registry.clone())
        .data(service_provider.clone())
        .data(auth.clone())
        .data(settings.clone())
        .data(validated_plugins.clone())
        .extension(GraphQLRequestLogger)
        .finish();
        // Self requester does not need loggers

        // Shared operational status across all schemas
        let operational_status_ref = Data::new(RwLock::new(operational_status.clone()));

        // Operational schema
        let operational_builder = with_cost_limits(OperationalSchema::build(
            Queries::new(),
            Mutations::new(),
            Subscriptions::default(),
        ))
        .data(connection_manager.clone())
        .data(loader_registry.clone())
        .data(service_provider.clone())
        .data(auth.clone())
        .data(settings.clone())
        .data(validated_plugins.clone())
        .data(subscription_broadcast.clone())
        // Add self requester to operational
        .data(Data::new(SelfRequestImpl::new_boxed(self_requester_schema)))
        .data(operational_status_ref.clone())
        .extension(GraphQLRequestLogger);

        // Initialisation schema should ony need service_provider
        let initialisation_builder = with_cost_limits(InitialisationSchema::build(
            InitialisationQueries,
            InitialisationMutations,
            InitialisationSubscriptions::default(),
        ))
        .data(service_provider.clone())
        .data(subscription_broadcast.clone())
        .data(operational_status_ref.clone())
        .data(subscription_broadcast.clone())
        .extension(GraphQLRequestLogger);

        let migration_builder = with_cost_limits(MigrationSchema::build(
            MigrationQueries,
            EmptyMutation,
            EmptySubscription,
        ))
        .data(service_provider.clone())
        .data(operational_status_ref.clone())
        .extension(GraphQLRequestLogger);

        GraphqlSchema {
            operational: operational_builder.finish(),
            initialisation: initialisation_builder.finish(),
            migration: migration_builder.finish(),
            operational_status: operational_status_ref.clone(),
            cookie_suffix,
        }
    }

    pub async fn set_operational_status(&self, operational_status: OperationalStatus) {
        (*self.operational_status.write().await) = operational_status;
    }

    pub async fn get_operational_status(&self) -> OperationalStatus {
        self.operational_status.read().await.clone()
    }

    async fn execute(&self, http_req: HttpRequest, req: GraphQLRequest) -> Response {
        let mut req = req.into_inner();
        req = req.data(QueryLogInfo::new());

        match &*self.operational_status.read().await {
            OperationalStatus::Operational => {
                // auth_data is only available in schema in operational mode
                let user_data = auth_data_from_request(&http_req, &self.cookie_suffix);
                self.operational.execute(req.data(user_data)).await
            }
            OperationalStatus::MigratingDatabase => self.migration.execute(req).await,
            OperationalStatus::Initialising => self.initialisation.execute(req).await,
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
            )
            .service(
                web::resource("/graphql/ws")
                    .guard(guard::Get())
                    .to(graphql_ws),
            );
    }
}

/// WebSocket endpoint for GraphQL subscriptions.
/// Routes to the correct schema based on operational status,
/// mirroring how the HTTP handler routes requests.
async fn graphql_ws(
    schema: Data<GraphqlSchema>,
    req: HttpRequest,
    payload: web::Payload,
) -> Result<HttpResponse, actix_web::Error> {
    // Pull the session token out of the WS upgrade request once. The browser sends the HttpOnly
    // session cookie on the upgrade (same as any HTTP request) but `on_connection_init` only
    // sees the client-supplied connectionParams JSON — it has no access to the request. We
    // capture the cookie value here so the closure can use it as the auth fallback.
    let cookie_token = auth_data_from_request(&req, &schema.cookie_suffix).auth_token;
    let on_connection_init = move |value: serde_json::Value| {
        let cookie_token = cookie_token.clone();
        async move {
            let mut data = async_graphql::Data::default();
            // Prefer the explicit Authorization in connectionParams (used by API integrations
            // that aren't cookie-based); fall back to the cookie captured from the upgrade.
            let auth_token = value
                .get("Authorization")
                .and_then(|v| v.as_str())
                .map(|t| t.strip_prefix("Bearer ").unwrap_or(t).to_string())
                .or(cookie_token);
            if auth_token.is_some() {
                data.insert(RequestUserData {
                    auth_token,
                    override_user_id: None,
                });
            }
            Ok(data)
        }
    };

    match &*schema.operational_status.read().await {
        OperationalStatus::Operational => GraphQLSubscription::new(schema.operational.clone())
            .on_connection_init(on_connection_init)
            .start(&req, payload),
        OperationalStatus::Initialising => GraphQLSubscription::new(schema.initialisation.clone())
            .on_connection_init(on_connection_init)
            .start(&req, payload),
        OperationalStatus::MigratingDatabase => {
            //TODO: add migration status subscription and route to that instead of returning an error here
            Err(actix_web::error::ErrorServiceUnavailable(
                "Subscriptions unavailable during database migration",
            ))
        }
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
    fn new_boxed(schema: Schema<Queries, Mutations, Subscriptions>) -> BoxedSelfRequest {
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

#[cfg(test)]
mod tests {
    use super::{MAX_QUERY_COMPLEXITY, MAX_QUERY_DEPTH};
    use async_graphql::parser::parse_query;
    use async_graphql::parser::types::{FragmentDefinition, Selection, SelectionSet};
    use async_graphql::{EmptyMutation, EmptySubscription, Name, Object, Positioned, Schema};
    use std::collections::HashMap;
    use std::path::{Path, PathBuf};

    struct DepthQuery;

    #[Object]
    impl DepthQuery {
        async fn value(&self) -> i32 {
            0
        }

        // Self-nesting object field, so an over-deep query is *type-valid* and
        // the depth limit is the only thing that can reject it. Selecting
        // sub-fields on the scalar `value` would also error, which would let
        // these tests pass for the wrong reason.
        async fn nested(&self) -> DepthQuery {
            DepthQuery
        }
    }

    fn build_limited_schema() -> Schema<DepthQuery, EmptyMutation, EmptySubscription> {
        super::with_cost_limits(Schema::build(DepthQuery, EmptyMutation, EmptySubscription))
            .finish()
    }

    // Regression test for security finding F-2 (issue #362): the schema builders
    // previously carried no depth/complexity limits, so a degenerate nested or
    // wide query was planned and (partially) executed before erroring — a cheap
    // DoS amplifier on low-powered site hardware. These tests pin the
    // `with_cost_limits` helper at the async-graphql validation layer; the four
    // real builders in `GraphqlSchema::new` are covered because they call the same
    // helper (grep for `with_cost_limits` to verify).
    #[actix_web::test]
    async fn query_depth_is_bounded() {
        let schema = build_limited_schema();
        let response = schema.execute(nested_query(MAX_QUERY_DEPTH + 5)).await;
        assert!(
            response.is_err(),
            "expected a depth validation error, got: {:?}",
            response
        );
        let message = format!("{:?}", response.errors);
        // async-graphql renders the depth error as "The recursion depth of the
        // query cannot be greater than `N`"; assert on the stable prefix.
        assert!(
            message.contains("recursion depth"),
            "expected depth-limit error, got: {}",
            message
        );
    }

    #[actix_web::test]
    async fn query_complexity_is_bounded() {
        let schema = build_limited_schema();
        let response = schema.execute(wide_query(MAX_QUERY_COMPLEXITY + 1)).await;
        assert!(
            response.is_err(),
            "expected a complexity validation error, got: {:?}",
            response
        );
        let message = format!("{:?}", response.errors);
        assert!(
            message.contains("Query is too complex"),
            "expected complexity-limit error, got: {}",
            message
        );
    }

    // Sanity pin: a trivial legitimate query still passes validation, so the
    // limits do not break normal clients.
    #[actix_web::test]
    async fn shallow_query_still_passes() {
        let schema = build_limited_schema();
        let response = schema.execute("{ value }").await;
        assert!(response.is_ok(), "expected success, got: {:?}", response);
    }

    // A query nesting `levels` object selections, ending in a scalar.
    fn nested_query(levels: usize) -> String {
        let mut query = String::from("query {");
        for _ in 0..levels {
            query.push_str("nested {");
        }
        query.push_str("value");
        for _ in 0..levels {
            query.push('}');
        }
        query.push('}');
        query
    }

    // A shallow query selecting the same scalar `fields` times under aliases.
    fn wide_query(fields: usize) -> String {
        let mut query = String::from("query {");
        for index in 0..fields {
            query.push_str(&format!("f{index}: value "));
        }
        query.push('}');
        query
    }

    /// Cost of one selection set under async-graphql's own metrics, as
    /// `(complexity, depth)`.
    ///
    /// Mirrors the two validation visitors in async-graphql 7.2.1:
    /// `ComplexityCalculate` charges every field `1 + child_complexity` (there
    /// is no custom `#[graphql(complexity)]` anywhere in this tree, so
    /// complexity is just the expanded field count), and `DepthCalculate`
    /// counts field nesting only — both visitors run in `VisitMode::Inline`, so
    /// fragment spreads and inline fragments are expanded in place and add no
    /// depth level of their own.
    ///
    /// `cost_walker_matches_async_graphql` pins this against the real validator,
    /// so a change in async-graphql's accounting fails there rather than
    /// silently skewing the report measurements below.
    fn selection_set_cost(
        set: &SelectionSet,
        fragments: &HashMap<Name, Positioned<FragmentDefinition>>,
        depth: usize,
        spread_path: &mut Vec<Name>,
    ) -> (usize, usize) {
        let mut complexity = 0;
        let mut max_depth = depth;

        for item in &set.items {
            match &item.node {
                Selection::Field(field) => {
                    let (child, child_depth) = selection_set_cost(
                        &field.node.selection_set.node,
                        fragments,
                        depth + 1,
                        spread_path,
                    );
                    complexity += 1 + child;
                    max_depth = max_depth.max(child_depth).max(depth + 1);
                }
                Selection::InlineFragment(inline) => {
                    let (child, child_depth) = selection_set_cost(
                        &inline.node.selection_set.node,
                        fragments,
                        depth,
                        spread_path,
                    );
                    complexity += child;
                    max_depth = max_depth.max(child_depth);
                }
                Selection::FragmentSpread(spread) => {
                    let name = &spread.node.fragment_name.node;
                    // A fragment cycle is illegal GraphQL and validation rejects
                    // it, but guard anyway so a malformed document fails the
                    // assertion rather than recursing forever.
                    if spread_path.contains(name) {
                        continue;
                    }
                    if let Some(fragment) = fragments.get(name) {
                        spread_path.push(name.clone());
                        let (child, child_depth) = selection_set_cost(
                            &fragment.node.selection_set.node,
                            fragments,
                            depth,
                            spread_path,
                        );
                        spread_path.pop();
                        complexity += child;
                        max_depth = max_depth.max(child_depth);
                    }
                }
            }
        }

        (complexity, max_depth)
    }

    /// Highest `(complexity, depth)` of any operation in a GraphQL document.
    /// Per operation, not summed: the server validates the one operation it is
    /// asked to run.
    fn document_cost(source: &str) -> (usize, usize) {
        let document = parse_query(source).expect("report query should parse");
        let mut complexity = 0;
        let mut depth = 0;
        for (_, operation) in document.operations.iter() {
            let (operation_complexity, operation_depth) = selection_set_cost(
                &operation.node.selection_set.node,
                &document.fragments,
                0,
                &mut Vec::new(),
            );
            complexity = complexity.max(operation_complexity);
            depth = depth.max(operation_depth);
        }
        (complexity, depth)
    }

    // Pins `selection_set_cost` against async-graphql's real validator: for a
    // query the walker scores at (complexity, depth), the limits set to exactly
    // those values must accept it and one less must reject it. If async-graphql
    // ever changes how it counts, this fails instead of the report figures
    // quietly drifting.
    #[actix_web::test]
    async fn cost_walker_matches_async_graphql() {
        let deep = nested_query(6);
        let (_, walked_depth) = document_cost(&deep);
        assert_eq!(walked_depth, 7, "6 `nested` levels plus the `value` leaf");

        let at_limit =
            super::with_cost_limits(Schema::build(DepthQuery, EmptyMutation, EmptySubscription))
                .limit_depth(walked_depth)
                .finish();
        assert!(
            at_limit.execute(deep.clone()).await.is_ok(),
            "limit_depth({walked_depth}) must accept a query the walker scores at {walked_depth}"
        );

        let below_limit = Schema::build(DepthQuery, EmptyMutation, EmptySubscription)
            .limit_depth(walked_depth - 1)
            .finish();
        assert!(
            below_limit.execute(deep).await.is_err(),
            "limit_depth({}) must reject it",
            walked_depth - 1
        );

        let wide = wide_query(12);
        let (walked_complexity, _) = document_cost(&wide);
        assert_eq!(walked_complexity, 12, "12 aliased scalar selections");

        let at_limit = Schema::build(DepthQuery, EmptyMutation, EmptySubscription)
            .limit_complexity(walked_complexity)
            .finish();
        assert!(
            at_limit.execute(wide.clone()).await.is_ok(),
            "limit_complexity({walked_complexity}) must accept it"
        );

        let below_limit = Schema::build(DepthQuery, EmptyMutation, EmptySubscription)
            .limit_complexity(walked_complexity - 1)
            .finish();
        assert!(
            below_limit.execute(wide).await.is_err(),
            "limit_complexity({}) must reject it",
            walked_complexity - 1
        );
    }

    fn repo_root() -> PathBuf {
        // CARGO_MANIFEST_DIR is <repo>/server/graphql.
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(2)
            .expect("graphql crate should sit two levels below the repo root")
            .to_path_buf()
    }

    fn graphql_files_under(dir: &Path, found: &mut Vec<PathBuf>) {
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                graphql_files_under(&path, found);
            } else if path.extension().is_some_and(|ext| ext == "graphql") {
                found.push(path);
            }
        }
    }

    // Reports are the query source most likely to be surprised by a cost
    // ceiling: they are authored outside the client, they are wide by nature,
    // and they run through the *self-requester* schema
    // (`server/graphql/reports/src/print.rs`), which carries the same limits as
    // client traffic. This walks every report and form query shipped in this
    // repo, all versions, plus the three built-in default queries, and asserts
    // each one is inside the ceilings with the measured margin reported.
    //
    // Raised by review on #362 ("did you look at graphql used in the reports
    // repo?"). The 82 customer report queries in the separate
    // `msupply-foundation/open-msupply-reports` repo were measured the same way
    // out of band — worst case there is complexity 83 / depth 13 — but they are
    // not checked in here, so this test covers what this repo ships.
    #[actix_web::test]
    async fn shipped_report_queries_are_within_cost_limits() {
        let root = repo_root();
        let mut files = Vec::new();
        graphql_files_under(&root.join("standard_reports"), &mut files);
        graphql_files_under(&root.join("standard_forms"), &mut files);
        files.sort();

        assert!(
            files.len() > 20,
            "expected to find the shipped report/form queries under {}, found {} — has the layout moved?",
            root.display(),
            files.len()
        );

        let mut documents: Vec<(String, String)> = files
            .iter()
            .map(|path| {
                let label = path
                    .strip_prefix(&root)
                    .unwrap_or(path)
                    .display()
                    .to_string();
                let source = std::fs::read_to_string(path)
                    .unwrap_or_else(|e| panic!("failed to read {label}: {e}"));
                (label, source)
            })
            .collect();

        for query in [
            service::report::definition::DefaultQuery::Invoice,
            service::report::definition::DefaultQuery::Stocktake,
            service::report::definition::DefaultQuery::Requisition,
        ] {
            documents.push((
                format!("built-in default query {query:?}"),
                service::report::default_queries::get_default_gql_query(query).query,
            ));
        }

        let mut worst_complexity = (0, String::new());
        let mut worst_depth = (0, String::new());

        for (label, source) in &documents {
            let (complexity, depth) = document_cost(source);

            assert!(
                depth <= MAX_QUERY_DEPTH,
                "report query {label} has depth {depth}, over MAX_QUERY_DEPTH ({MAX_QUERY_DEPTH})"
            );
            assert!(
                complexity <= MAX_QUERY_COMPLEXITY,
                "report query {label} has complexity {complexity}, over MAX_QUERY_COMPLEXITY ({MAX_QUERY_COMPLEXITY})"
            );

            if complexity > worst_complexity.0 {
                worst_complexity = (complexity, label.clone());
            }
            if depth > worst_depth.0 {
                worst_depth = (depth, label.clone());
            }
        }

        println!(
            "checked {} shipped report queries\n  worst complexity {} / {} — {}\n  worst depth      {} / {} — {}",
            documents.len(),
            worst_complexity.0,
            MAX_QUERY_COMPLEXITY,
            worst_complexity.1,
            worst_depth.0,
            MAX_QUERY_DEPTH,
            worst_depth.1,
        );
    }
}
