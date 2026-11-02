use log::Level;

mod central_server_only;
pub mod content_length_limit;
mod security_headers;

pub use security_headers::app_policy_for_document;

pub fn compress() -> actix_web::middleware::Compress {
    actix_web::middleware::Compress::default()
}

pub fn logger() -> actix_web::middleware::Logger {
    actix_web::middleware::Logger::new(r#""%r" FROM: "%{Referer}i" STATUS: %s"#)
        .log_level(Level::Info)
        .log_target("request_log")
        .exclude("/graphql")
}

pub(crate) fn central_server_only() -> central_server_only::CentralServerOnly {
    central_server_only::CentralServerOnly::default()
}

pub fn security_headers(is_https: bool) -> security_headers::SecurityHeaders {
    security_headers::SecurityHeaders::new(is_https)
}

pub fn limit_content_length() -> content_length_limit::ContentLengthLimit {
    content_length_limit::ContentLengthLimit::default()
}
