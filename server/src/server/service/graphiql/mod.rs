pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    cfg.service(
        actix_web::web::scope("/graphiql")
            .route("", actix_web::web::get().to(graphiql)),
    );
}

async fn graphiql() -> Result<actix_web::HttpResponse, actix_web::Error> {
    juniper_actix::graphiql_handler("/graphql", None).await
}
