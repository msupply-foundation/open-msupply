use actix_web::{
    App, Error,
    body::MessageBody,
    dev::{ServiceFactory, ServiceRequest, ServiceResponse},
};
use log::Level;
use service::settings::Settings;

use crate::cors::{cors_policy_for, websocket_origin_check_for};

mod central_server_only;
pub mod content_length_limit;
mod initialised_only;
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

/// The main server's middleware, innermost first. The CORS tests (`cors.rs`) build their app with
/// this too, so they check the chain the server really runs.
pub(crate) fn wrap_main_server<T, B>(
    app: App<T>,
    settings: &Settings,
    is_develop: bool,
    is_https: bool,
) -> App<
    impl ServiceFactory<
        ServiceRequest,
        Config = (),
        Response = ServiceResponse<impl MessageBody + use<T, B>>,
        Error = Error,
        InitError = (),
    > + use<T, B>,
>
where
    T: ServiceFactory<
            ServiceRequest,
            Config = (),
            Response = ServiceResponse<B>,
            Error = Error,
            InitError = (),
        > + 'static,
    T::Service: 'static,
    B: MessageBody + 'static,
{
    app
        // Inside the logger, so a refused upgrade shows in the request log
        .wrap(websocket_origin_check_for(settings, is_develop))
        .wrap(logger())
        // Outside the WebSocket check, so a refused upgrade's 403 gets the headers too
        .wrap(security_headers(is_https))
        .wrap(cors_policy_for(settings, is_develop))
        .wrap(compress())
}

pub(crate) fn central_server_only() -> central_server_only::CentralServerOnly {
    central_server_only::CentralServerOnly::default()
}

/// 503 with `message` until this site's first sync has integrated (see [`initialised_only::InitialisedOnly`]).
pub(crate) fn initialised_only(message: &'static str) -> initialised_only::InitialisedOnly {
    initialised_only::InitialisedOnly { message }
}

pub fn security_headers(is_https: bool) -> security_headers::SecurityHeaders {
    security_headers::SecurityHeaders::new(is_https)
}

pub fn limit_content_length() -> content_length_limit::ContentLengthLimit {
    content_length_limit::ContentLengthLimit::default()
}
