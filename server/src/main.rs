//! src/main.rs

use std::{collections::HashMap, env};

use actix_cors::Cors;
use actix_web::{http::header, middleware, web, App, Error, HttpResponse, HttpServer};
use juniper::{graphql_object, EmptyMutation, EmptySubscription, GraphQLObject, RootNode};
use juniper_actix::{graphql_handler};

#[derive(Clone, GraphQLObject)]
// A requisition.
pub struct Requisition {
    id: String,
    from_id: String,
    to_id: String,
    requisition_lines: Vec<RequisitionLine>,
}

#[derive(Clone, GraphQLObject)]
// A requisition line.
pub struct RequisitionLine {
    id: String,
    requisition_id: String,
    item_id: String,
    quantity: f64,
}

#[derive(Default, Clone)]
pub struct Database {
    // Mock database connection with hash lookups.
    requisitions: HashMap<String, Requisition>,
}

pub fn generate_requisitions() -> HashMap<String, Requisition> {
    let mut requisitions = HashMap::new();

    requisitions.insert(
        "requisition_a".to_string(),
        Requisition {
            id: "requisition_a".to_string(),
            from_id: "store_a".to_string(),
            to_id: "store_b".to_string(),
            requisition_lines: vec![
                RequisitionLine {
                    id: "requisition_line_a".to_string(),
                    requisition_id: "requisition_a".to_string(),
                    item_id: "item_a".to_string(),
                    quantity: 1.0,
                },
                RequisitionLine {
                    id: "requisition_line_b".to_string(),
                    requisition_id: "requisition_a".to_string(),
                    item_id: "item_b".to_string(),
                    quantity: 2.0,
                },
            ],
        },
    );

    requisitions.insert(
        "requisition_b".to_string(),
        Requisition {
            id: "requisition_b".to_string(),
            from_id: "store_a".to_string(),
            to_id: "store_c".to_string(),
            requisition_lines: vec![
                RequisitionLine {
                    id: "requisition_line_c".to_string(),
                    requisition_id: "requisition_b".to_string(),
                    item_id: "item_a".to_string(),
                    quantity: 3.0,
                },
                RequisitionLine {
                    id: "requisition_line_d".to_string(),
                    requisition_id: "requisition_b".to_string(),
                    item_id: "item_b".to_string(),
                    quantity: 4.0,
                },
            ],
        },
    );

    requisitions.insert(
        "requisition_c".to_string(),
        Requisition {
            id: "requisition_c".to_string(),
            from_id: "store_b".to_string(),
            to_id: "store_c".to_string(),
            requisition_lines:     vec![RequisitionLine {
                id: "requisition_line_d".to_string(),
                requisition_id: "requisition_c".to_string(),
                item_id: "item_a".to_string(),
                quantity: 5.0,
            }],
        },
    );

    requisitions
}

impl Database {
    pub fn new() -> Database {
        let requisitions = generate_requisitions();
        Database { requisitions }
    }

    pub fn get_requisition(&self, id: String) -> Option<&Requisition> {
        self.requisitions.get(&id)
    }
}

impl juniper::Context for Database {}

struct Query;
#[graphql_object(context = Database)]
impl Query {
    fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    fn requisition(database: &Database, id: String) -> Option<&Requisition> {
        database.get_requisition(id)
    }
}

type Schema = RootNode<'static, Query, EmptyMutation<Database>, EmptySubscription<Database>>;

fn schema() -> Schema {
    Schema::new(
        Query,
        EmptyMutation::<Database>::new(),
        EmptySubscription::<Database>::new(),
    )
}

async fn graphql_route(
    req: actix_web::HttpRequest,
    payload: actix_web::web::Payload,
    schema: web::Data<Schema>,
) -> Result<HttpResponse, Error> {
    let context = Database::new();
    graphql_handler(&schema, &context, req, payload).await
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let server = HttpServer::new(move || {
        App::new()
            .data(schema())
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
    server.bind("127.0.0.1:8080").unwrap().run().await
}
