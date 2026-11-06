use log::Level;

mod central_server_only;
pub mod content_length_limit;
mod initialised_only;

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

/// 503 with `message` until this site's first sync has integrated (see [`initialised_only::InitialisedOnly`]).
pub(crate) fn initialised_only(message: &'static str) -> initialised_only::InitialisedOnly {
    initialised_only::InitialisedOnly { message }
}

pub fn limit_content_length() -> content_length_limit::ContentLengthLimit {
    content_length_limit::ContentLengthLimit::default()
}
