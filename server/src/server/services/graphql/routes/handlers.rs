use crate::database::DatabaseConnection;
use crate::server::authorization::Authorization;
use crate::server::graphql::schema::Schema;

pub async fn graphql(
    req: actix_web::HttpRequest,
    payload: actix_web::web::Payload,
    schema: actix_web::web::Data<Schema>,
    context: actix_web::web::Data<DatabaseConnection>,
    authorization: Option<Authorization>,
) -> Result<actix_web::HttpResponse, actix_web::Error> {
    // TODO: update `graphql_handler` context with user data.
    log::info!("Authorization: {}", authorization.unwrap());
    juniper_actix::graphql_handler(&schema, &context, req, payload).await
}
