pub async fn graphiql() -> Result<actix_web::HttpResponse, actix_web::Error> {
    juniper_actix::graphiql_handler("/graphql", None).await
}
