use crate::server::data::Registry;
use crate::server::service::graphql::schema::Schema;

pub async fn graphql(
    req: actix_web::HttpRequest,
    payload: actix_web::web::Payload,
    schema: actix_web::web::Data<Schema>,
    context: actix_web::web::Data<Registry>,
) -> Result<actix_web::HttpResponse, actix_web::Error> {
    juniper_actix::graphql_handler(&schema, &context, req, payload).await
}
