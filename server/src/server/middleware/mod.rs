pub fn compress() -> actix_web::middleware::Compress {
    actix_web::middleware::Compress::default()
}

pub fn logger() -> actix_web::middleware::Logger {
    actix_web::middleware::Logger::default()
}

pub fn cors(origin: &str) -> actix_cors::Cors {
    actix_cors::Cors::default()
        .supports_credentials()
        .allowed_origin(origin)
}
