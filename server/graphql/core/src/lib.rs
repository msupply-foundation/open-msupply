pub mod generic_filters;
pub mod loader;
pub mod pagination;
pub mod simple_generic_errors;
pub mod standard_graphql_error;
pub mod test_helpers;

use std::sync::RwLock;

use actix_web::cookie::Cookie;
use actix_web::web::Data;
use actix_web::HttpRequest;
use async_graphql::Context;
use repository::database_settings::DatabaseSettings;
use repository::{get_storage_connection_manager, StorageConnectionManager};
use reqwest::header::COOKIE;
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;

use loader::{get_loaders, LoaderRegistry};
use service::token_bucket::TokenBucket;

// Sugar that helps make things neater and avoid errors that would only crop up at runtime.
pub trait ContextExt {
    fn get_connection_manager(&self) -> &StorageConnectionManager;
    fn get_loader<T: anymap::any::Any + Send + Sync>(&self) -> &T;
    fn service_provider(&self) -> &ServiceProvider;
    fn get_auth_data(&self) -> &AuthData;
    fn get_auth_token(&self) -> Option<String>;
}

impl<'a> ContextExt for Context<'a> {
    fn get_connection_manager(&self) -> &StorageConnectionManager {
        &self.data_unchecked::<Data<StorageConnectionManager>>()
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
}

pub struct RequestUserData {
    auth_token: Option<String>,
    pub refresh_token: Option<String>,
}

pub fn auth_data_from_request(http_req: &HttpRequest) -> RequestUserData {
    let headers = http_req.headers();
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
            .and_then(|header| Cookie::parse(header).ok())
            .map(|cookie| cookie.value().to_owned())
    });

    RequestUserData {
        auth_token,
        refresh_token,
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
            not_equal_all: None,
        }
    }};
}
