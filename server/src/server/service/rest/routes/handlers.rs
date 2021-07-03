pub async fn health_check(
    _req: actix_web::HttpRequest,
) -> Result<actix_web::HttpResponse, actix_web::Error> {
    Ok(actix_web::HttpResponse::Ok().finish())
}
