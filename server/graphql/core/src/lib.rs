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
    pub refresh_token: Option<String>,
    /// Port from the Host header, used to scope cookie names per-port.
    /// None when the request uses a standard port (80/443) or no port is specified.
    pub host_port: Option<String>,
}

/// Extract the port from a Host header value, if present.
/// Returns None for standard ports or when no port is specified.
fn port_from_host(host: &str) -> Option<&str> {
    host.rsplit_once(':').map(|(_, port)| port)
}

pub fn auth_data_from_request(http_req: &HttpRequest) -> RequestUserData {
    let headers = http_req.headers();

    // Extract port from Host header for port-scoped cookie names
    let host_port = headers
        .get("Host")
        .and_then(|h| h.to_str().ok())
        .and_then(port_from_host)
        .map(|p| p.to_string());

    // Build the expected refresh_token cookie name based on the port
    let refresh_cookie_name = match &host_port {
        Some(port) => format!("refresh_token_{}", port),
        None => "refresh_token".to_string(),
    };

    // retrieve auth token
    let auth_token = headers.get("Authorization").and_then(|header_value| {
        header_value.to_str().ok().and_then(|header| {
            if header.starts_with("Bearer ") {
                return Some(header["Bearer ".len()..header.len()].to_string());
            }
            None
        })
    });

    // retrieve refresh token
    let refresh_token = headers.get(COOKIE).and_then(|header_value| {
        header_value
            .to_str()
            .ok()
            .and_then(|header| {
                let cookies = header.split(' ').collect::<Vec<&str>>();
                cookies
                    .into_iter()
                    .map(|raw_cookie| Cookie::parse(raw_cookie).ok())
                    .find(|cookie_option| match &cookie_option {
                        Some(cookie) => cookie.name() == refresh_cookie_name,
                        None => false,
                    })
                    .flatten()
            })
            .map(|cookie| cookie.value().to_owned())
    });

    RequestUserData {
        auth_token,
        refresh_token,
        override_user_id: None,
        host_port,
    }
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
