pub mod dynamic_filter;
pub mod generic_filters;
pub mod generic_inputs;
pub mod loader;
pub mod operational_status;
pub mod pagination;
pub mod simple_generic_errors;
pub mod standard_graphql_error;
pub mod test_helpers;

use std::sync::Mutex;

pub use operational_status::OperationalStatus;

use actix_web::cookie::Cookie;
use actix_web::web::Data;
use actix_web::HttpRequest;
use async_graphql::{Context, Request, Response};

use actix_web::http::header::COOKIE;
use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::plugin::validation::ValidatedPluginBucket;
use service::service_provider::ServiceProvider;

use loader::LoaderRegistry;
use service::settings::Settings;
use tokio::sync::mpsc::Sender;
use tokio::sync::RwLock;

/// Performs a query to ourself, e.g. the report endpoint can query
#[async_trait::async_trait]
pub trait SelfRequest: Send + Sync {
    async fn call(&self, request: Request, user_data: RequestUserData) -> Response;
}
pub type BoxedSelfRequest = Box<dyn SelfRequest>;

// Sugar that helps make things neater and avoid errors that would only crop up at runtime.
pub trait ContextExt {
    fn get_connection_manager(&self) -> &StorageConnectionManager;
    fn get_loader<T: anymap::any::Any + Send + Sync>(&self) -> &T;
    fn service_provider(&self) -> &ServiceProvider;
    fn get_auth_data(&self) -> &AuthData;
    fn get_auth_token(&self) -> Option<String>;
    fn get_override_user_id(&self) -> Option<String>;
    fn self_request(&self) -> Option<&BoxedSelfRequest>;
    fn get_settings(&self) -> &Settings;
    fn get_validated_plugins(&self) -> &Mutex<ValidatedPluginBucket>;
    fn restart_switch(&self) -> Sender<bool>;
    fn get_operational_status(&self) -> &RwLock<OperationalStatus>;
}

impl<'a> ContextExt for Context<'a> {
    fn get_connection_manager(&self) -> &StorageConnectionManager {
        self.data_unchecked::<Data<StorageConnectionManager>>()
    }

    fn get_loader<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        self.data_unchecked::<Data<LoaderRegistry>>().get::<T>()
    }

    fn service_provider(&self) -> &ServiceProvider {
        self.data_unchecked::<Data<ServiceProvider>>()
    }

    fn get_auth_data(&self) -> &AuthData {
        self.data_unchecked::<Data<AuthData>>()
    }

    fn get_auth_token(&self) -> Option<String> {
        self.data_opt::<RequestUserData>()
            .and_then(|d| d.auth_token.to_owned())
    }

    fn get_override_user_id(&self) -> Option<String> {
        self.data_opt::<RequestUserData>()
            .and_then(|d| d.override_user_id.to_owned())
    }

    fn get_settings(&self) -> &Settings {
        self.data_unchecked::<Data<Settings>>()
    }

    fn get_validated_plugins(&self) -> &Mutex<ValidatedPluginBucket> {
        self.data_unchecked::<Data<Mutex<ValidatedPluginBucket>>>()
    }

    fn self_request(&self) -> Option<&BoxedSelfRequest> {
        self.data_opt::<Data<BoxedSelfRequest>>()
            .map(|data| data.get_ref())
    }

    fn restart_switch(&self) -> Sender<bool> {
        self.data_unchecked::<Data<Sender<bool>>>().as_ref().clone()
    }

    fn get_operational_status(&self) -> &RwLock<OperationalStatus> {
        self.data_unchecked::<Data<RwLock<OperationalStatus>>>()
    }
}

#[derive(Clone)]
pub struct RequestUserData {
    // Used for self execution of graphql queries for plugins
    pub override_user_id: Option<String>,
    pub auth_token: Option<String>,
}

/// Extracts the session token from the request. Reads `Authorization: Bearer …` first (used by
/// API integrations like Sage), then falls back to the HttpOnly `session_{suffix}` cookie used by
/// the web client. Returns `None` if neither is present.
pub fn auth_data_from_request(http_req: &HttpRequest, cookie_suffix: &str) -> RequestUserData {
    let headers = http_req.headers();
    let auth_token = headers
        .get("Authorization")
        .and_then(|header_value| header_value.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer ").map(|t| t.to_string()))
        .or_else(|| session_cookie_value(http_req, cookie_suffix));

    RequestUserData {
        auth_token,
        override_user_id: None,
    }
}

fn session_cookie_value(http_req: &HttpRequest, cookie_suffix: &str) -> Option<String> {
    let cookie_name = format!("session_{cookie_suffix}");
    // RFC 6265: a Cookie header is a `; `-separated list of name=value pairs — but a request
    // may carry *several* Cookie header fields: HTTP/2+ clients split ("crumble") the cookie
    // list into one field per cookie for better compression (RFC 9113 §8.2.3), ordered
    // oldest-created first, so the freshly issued session cookie tends to arrive last. Scan
    // every field (skipping any individually malformed cookie) rather than only the first,
    // otherwise any stale cookie on the origin hides the session cookie (issue
    // msupply-foundation/open-msupply-frontend#1088).
    http_req
        .headers()
        .get_all(COOKIE)
        .filter_map(|header_value| header_value.to_str().ok())
        .flat_map(|header| header.split(';'))
        .filter_map(|raw_cookie| Cookie::parse(raw_cookie.trim()).ok())
        .find(|cookie| cookie.name() == cookie_name)
        .map(|cookie| cookie.value().to_owned())
}

#[macro_export]
macro_rules! map_filter {
    ($from:ident, $f:expr) => {{
        repository::EqualFilter {
            equal_to: $from.equal_to.map($f),
            not_equal_to: $from.not_equal_to.map($f),
            equal_any: $from
                .equal_any
                .map(|inputs| inputs.into_iter().map($f).collect()),
            not_equal_to_or_null: None,
            equal_any_or_null: None,
            not_equal_all: $from
                .not_equal_all
                .map(|inputs| inputs.into_iter().map($f).collect()),
            is_null: None,
        }
    }};
}

#[cfg(test)]
mod session_cookie_tests {
    use super::*;
    use actix_web::test::TestRequest;

    #[test]
    fn finds_session_cookie_in_single_combined_header() {
        // HTTP/1.1 style: one Cookie header with a `; `-separated list.
        let req = TestRequest::default()
            .insert_header((COOKIE, "refresh_token=stale; session_8000=the-token"))
            .to_http_request();
        assert_eq!(
            session_cookie_value(&req, "8000"),
            Some("the-token".to_string())
        );
    }

    #[test]
    fn finds_session_cookie_split_across_multiple_headers() {
        // HTTP/2 style: the client "crumbles" the cookie list into one header field per
        // cookie, oldest first — the fresh session cookie arrives last (issue
        // msupply-foundation/open-msupply-frontend#1088).
        let req = TestRequest::default()
            .append_header((COOKIE, "auth=legacy-json-blob"))
            .append_header((COOKIE, "refresh_token=stale"))
            .append_header((COOKIE, "session_8000=the-token"))
            .to_http_request();
        assert_eq!(
            session_cookie_value(&req, "8000"),
            Some("the-token".to_string())
        );
    }

    #[test]
    fn missing_session_cookie_returns_none() {
        let req = TestRequest::default()
            .append_header((COOKIE, "refresh_token=stale"))
            .to_http_request();
        assert_eq!(session_cookie_value(&req, "8000"), None);
    }

    #[test]
    fn wrong_suffix_is_not_matched() {
        // Two instances on one domain must not read each other's sessions.
        let req = TestRequest::default()
            .append_header((COOKIE, "session_8000=the-token"))
            .to_http_request();
        assert_eq!(session_cookie_value(&req, "8002"), None);
    }
}
