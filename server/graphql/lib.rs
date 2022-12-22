#[cfg(test)]
mod tests;

use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use actix_web::{guard, HttpRequest};

use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{EmptySubscription, Schema};
use async_graphql::{MergedObject, Response};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use graphql_batch_mutations::BatchMutations;
use graphql_core::loader::LoaderRegistry;
use graphql_core::{auth_data_from_request, BoxedSelfRequest, RequestUserData, SelfRequest};
use graphql_general::{
    GeneralMutations, GeneralQueries, InitialisationMutations, InitialisationQueries,
};
use graphql_invoice::{InvoiceMutations, InvoiceQueries};
use graphql_invoice_line::InvoiceLineMutations;
use graphql_location::{LocationMutations, LocationQueries};
use graphql_reports::ReportQueries;
use graphql_requisition::{RequisitionMutations, RequisitionQueries};
use graphql_requisition_line::RequisitionLineMutations;
use graphql_stock_line::{StockLineMutations, StockLineQueries};
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::StocktakeLineMutations;

use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use tokio::sync::RwLock;

pub type OperationalSchema =
    async_graphql::Schema<Queries, Mutations, async_graphql::EmptySubscription>;
pub type InitialisationSchema = async_graphql::Schema<
    InitialisationQueries,
    InitialisationMutations,
    async_graphql::EmptySubscription,
>;

#[derive(MergedObject, Default, Clone)]
pub struct Queries(
    pub InvoiceQueries,
    pub LocationQueries,
    pub StocktakeQueries,
    pub GeneralQueries,
    pub RequisitionQueries,
    pub ReportQueries,
    pub StockLineQueries,
);

impl Queries {
    pub fn new() -> Queries {
        Queries(
            InvoiceQueries,
            LocationQueries,
            StocktakeQueries,
            GeneralQueries,
            RequisitionQueries,
            ReportQueries,
            StockLineQueries,
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
    pub GeneralMutations,
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
            GeneralMutations,
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
}

impl GraphqlSchema {
    pub fn new(data: GraphSchemaData, is_operational: bool) -> GraphqlSchema {
        let GraphSchemaData {
            connection_manager,
            loader_registry,
            service_provider,
            auth,
            settings,
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
        .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
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
        self.schema.execute(query).await.into()
    }
}
