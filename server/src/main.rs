//! src/main.rs

mod database;
mod graphql;

use database::Database;
use graphql::schema::{Requisition, InputRequisitionLine};
use graphql::mutations::mutate_requisition;
use graphql::queries::query_requisition;

use actix_cors::Cors;
use actix_web::{http::header, middleware, web, App, Error, HttpResponse, HttpServer};
use juniper::{graphql_object, EmptySubscription, RootNode};
use juniper_actix::graphql_handler;
use std::env;
use sqlx::PgPool;

impl juniper::Context for database::database::Database {}

pub struct Query;
#[graphql_object(context = database::Database)]
impl Query {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(database: &database::Database, id: String) -> Requisition {
        query_requisition(database, id).await
    }
}

pub struct Mutations;
#[graphql_object(context = Database)]
impl Mutations {
    #[graphql(arguments(
        id(description = "id of the requisition"),
        from_id(description = "id of the sending store"),
        to_id(description = "id of the receiving store"),
        requisition_lines(description = "requisition lines attached to the requisition")
    ))]
    async fn insert_requisition(
        database: &Database,
        id: String,
        from_id: String,
        to_id: String,
        requisition_lines: Vec<InputRequisitionLine>,
    ) -> Requisition {
        mutate_requisition(database, id, from_id, to_id, requisition_lines).await
    }
}

type Schema = RootNode<'static, Query, Mutations, EmptySubscription<Database>>;

fn schema() -> Schema {
    Schema::new(Query, Mutations, EmptySubscription::<Database>::new())
}

async fn graphql_route(
    req: actix_web::HttpRequest,
    payload: actix_web::web::Payload,
    schema: web::Data<Schema>,
    database: web::Data<Database>,
) -> Result<HttpResponse, Error> {
    let context = database.get_ref().clone();
    graphql_handler(&schema, &context, req, payload).await
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let connection_pool =
        PgPool::connect("postgres://postgres:password@localhost/omsupply-database")
            .await
            .expect("Failed to connect to database");

    let database = Database::new_with_data(connection_pool).await;

    let server = HttpServer::new(move || {
        App::new()
            .data(schema())
            .data(database.clone())
            .wrap(middleware::Compress::default())
            .wrap(middleware::Logger::default())
            .wrap(
                Cors::default()
                    .allowed_origin("http://127.0.0.1:8080")
                    .allowed_methods(vec!["POST", "GET"])
                    .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
                    .allowed_header(header::CONTENT_TYPE)
                    .supports_credentials()
                    .max_age(3600),
            )
            .service(
                web::resource("/graphql")
                    .route(web::post().to(graphql_route))
                    .route(web::get().to(graphql_route)),
            )
    });

    server
        .bind("127.0.0.1:8080")
        .expect("Failed to bind server to address")
        .run()
        .await
}
