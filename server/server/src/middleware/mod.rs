mod central_server_only;

pub fn compress() -> actix_web::middleware::Compress {
    actix_web::middleware::Compress::default()
}

pub fn logger() -> actix_web::middleware::Logger {
    actix_web::middleware::Logger::default()
}

pub(crate) fn central_server_only() -> central_server_only::CentralServerOnly {
    central_server_only::CentralServerOnly::default()
}
