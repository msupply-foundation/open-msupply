use actix_cors::Cors;
use actix_web::{
    Error, HttpResponse,
    body::{EitherBody, MessageBody},
    dev::{RequestHead, Service, ServiceRequest, ServiceResponse, Transform},
    http::header::{self, HeaderValue},
    middleware::{Next, from_fn},
};
use log::warn;
use service::settings::{Settings, is_develop};

pub fn cors_policy(config_settings: &Settings) -> Cors {
    cors_policy_for(config_settings, is_develop())
}

fn cors_policy_for(config_settings: &Settings, is_develop: bool) -> Cors {
    let cors = if is_develop {
        Cors::permissive()
    } else {
        let cors_origins = config_settings.server.cors_origins.clone();
        Cors::default()
            .supports_credentials()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::ACCEPT,
                header::CONTENT_TYPE,
                header::CONTENT_DISPOSITION,
                header::UPGRADE,
                header::CONNECTION,
                // Required for GraphQL subscriptions over WebSocket
                header::HeaderName::from_static("sec-websocket-protocol"),
            ])
            .max_age(3600)
            .allowed_origin_fn(move |origin, req| is_origin_allowed(&cors_origins, origin, req))
    };
    cors
}

/// Browsers don't apply CORS to WebSocket upgrades, and actix-cors doesn't refuse a disallowed
/// origin (it only leaves out `Access-Control-Allow-Origin`, which a WebSocket never checks). So
/// this refuses an upgrade whose `Origin` the CORS policy above wouldn't allow (#1644).
///
/// No `Origin` header is let through: browsers always send one on a WebSocket upgrade, so it's a
/// non-browser client. That holds no user's browser cookies and could send any `Origin`, so
/// refusing it protects nothing. HTTP is the same: actix-cors only checks requests with an `Origin`.
pub fn websocket_origin_check<S, B>(
    config_settings: &Settings,
) -> impl Transform<
    S,
    ServiceRequest,
    Response = ServiceResponse<EitherBody<B>>,
    Error = Error,
    InitError = (),
> + use<S, B>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    websocket_origin_check_for(config_settings, is_develop())
}

fn websocket_origin_check_for<S, B>(
    config_settings: &Settings,
    is_develop: bool,
) -> impl Transform<
    S,
    ServiceRequest,
    Response = ServiceResponse<EitherBody<B>>,
    Error = Error,
    InitError = (),
> + use<S, B>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    let cors_origins = config_settings.server.cors_origins.clone();
    from_fn(move |req: ServiceRequest, next: Next<B>| {
        // Develop builds allow any origin, matching `Cors::permissive()` above
        let refused_origin = match req.headers().get(header::ORIGIN) {
            Some(origin)
                if !is_develop
                    && is_websocket_upgrade(req.head())
                    && !is_origin_allowed(&cors_origins, origin, req.head()) =>
            {
                Some(origin.clone())
            }
            _ => None,
        };
        async move {
            if let Some(origin) = refused_origin {
                warn!(
                    "Refused WebSocket upgrade from origin {:?}: not same-origin and not in server.cors_origins",
                    origin
                );
                return Ok(req
                    .into_response(HttpResponse::Forbidden().finish())
                    .map_into_right_body());
            }
            next.call(req)
                .await
                .map(ServiceResponse::map_into_left_body)
        }
    })
}

/// Whether a browser page at `origin` may make credentialed requests to this server. The one
/// rule shared by the HTTP CORS policy and the WebSocket upgrade check, so the two can't drift
/// apart (#1644).
fn is_origin_allowed(cors_origins: &[String], origin: &HeaderValue, req: &RequestHead) -> bool {
    if cors_origins
        .iter()
        .any(|allowed| allowed.as_bytes() == origin.as_bytes())
    {
        return true;
    }

    match req
        .headers()
        .get("sec-fetch-site")
        .map(HeaderValue::as_bytes)
    {
        Some(b"same-origin") => true,
        // Both 'none' and None value indicates browser considers to be the same origin
        // found this in an edge case when connecting by IP in Chrome sec-fetch-site headers are missing
        Some(b"none") => true,
        None => true,
        // Includes `same-site`: a page on another subdomain of the same site (e.g. another
        // *.msupply.org server) is not trusted unless it's listed in cors_origins (#1644)
        _ => false,
    }
}

fn is_websocket_upgrade(req: &RequestHead) -> bool {
    req.headers()
        .get(header::UPGRADE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().contains("websocket"))
}

#[cfg(test)]
mod tests {
    use super::{cors_policy_for, websocket_origin_check_for};
    use actix_web::{
        App, Error, HttpRequest, HttpResponse,
        body::MessageBody,
        dev::{ServiceFactory, ServiceRequest, ServiceResponse},
        http::{Method, StatusCode, header},
        middleware::Condition,
        test, web,
    };
    use async_graphql::{EmptyMutation, EmptySubscription, Object, Schema};
    use async_graphql_actix_web::GraphQLSubscription;
    use repository::database_settings::DatabaseSettings;
    use service::settings::{Settings, test_settings};

    const LISTED_ORIGIN: &str = "https://listed.example";

    fn settings() -> Settings {
        let mut settings = test_settings(
            DatabaseSettings {
                username: String::new(),
                password: String::new(),
                port: 0,
                host: String::new(),
                database_name: "test".to_string(),
                database_path: None,
                connection_pool_max_connections: None,
                connection_pool_min_idle: None,
                connection_pool_timeout_seconds: None,
                init_sql: None,
            },
            None,
        );
        settings.server.cors_origins = vec![LISTED_ORIGIN.to_string()];
        settings
    }

    struct Query;

    #[Object]
    impl Query {
        async fn ping(&self) -> bool {
            true
        }
    }

    // A real GraphQL WebSocket handshake, as served at /graphql/ws
    async fn graphql_ws(req: HttpRequest, payload: web::Payload) -> Result<HttpResponse, Error> {
        GraphQLSubscription::new(Schema::new(Query, EmptyMutation, EmptySubscription))
            .start(&req, payload)
    }

    /// The main server's middleware as built for a release binary (both checks are given
    /// `is_develop: false`, since tests run as a debug build).
    fn release_app(
        with_websocket_check: bool,
    ) -> App<
        impl ServiceFactory<
            ServiceRequest,
            Config = (),
            Response = ServiceResponse<impl MessageBody>,
            Error = Error,
            InitError = (),
        >,
    > {
        let settings = settings();
        App::new()
            .wrap(Condition::new(
                with_websocket_check,
                websocket_origin_check_for(&settings, false),
            ))
            .wrap(cors_policy_for(&settings, false))
            .route("/graphql", web::post().to(HttpResponse::Ok))
            .route("/graphql/ws", web::get().to(graphql_ws))
    }

    fn websocket_upgrade(origin: Option<&str>, sec_fetch_site: Option<&str>) -> test::TestRequest {
        let mut request = test::TestRequest::get()
            .uri("/graphql/ws")
            .insert_header((header::UPGRADE, "websocket"))
            .insert_header((header::CONNECTION, "Upgrade"))
            .insert_header((header::SEC_WEBSOCKET_VERSION, "13"))
            .insert_header((header::SEC_WEBSOCKET_KEY, "dGhlIHNhbXBsZSBub25jZQ=="))
            .insert_header((header::SEC_WEBSOCKET_PROTOCOL, "graphql-transport-ws"))
            .insert_header(("sec-fetch-mode", "websocket"));
        if let Some(origin) = origin {
            request = request.insert_header((header::ORIGIN, origin));
        }
        if let Some(sec_fetch_site) = sec_fetch_site {
            request = request.insert_header(("sec-fetch-site", sec_fetch_site));
        }
        request
    }

    // Why the WebSocket check exists: the CORS layer on its own lets a cross-site page complete a
    // GraphQL WebSocket handshake (#1644)
    #[actix_web::test]
    async fn cors_alone_does_not_refuse_a_websocket_upgrade() {
        let app = test::init_service(release_app(false)).await;
        let response = test::call_service(
            &app,
            websocket_upgrade(Some("https://evil.example"), Some("cross-site")).to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::SWITCHING_PROTOCOLS);
    }

    #[actix_web::test]
    async fn websocket_upgrade_from_disallowed_origin_is_refused() {
        let app = test::init_service(release_app(true)).await;

        for (origin, sec_fetch_site) in [
            ("https://evil.example", "cross-site"),
            // Another subdomain of the same site, e.g. another *.msupply.org server
            ("https://other.listed.example", "same-site"),
        ] {
            let response = test::call_service(
                &app,
                websocket_upgrade(Some(origin), Some(sec_fetch_site)).to_request(),
            )
            .await;
            assert_eq!(
                response.status(),
                StatusCode::FORBIDDEN,
                "{origin} ({sec_fetch_site}) should be refused"
            );
        }
    }

    #[actix_web::test]
    async fn websocket_upgrade_from_allowed_origin_is_accepted() {
        let app = test::init_service(release_app(true)).await;

        for (origin, sec_fetch_site) in [
            // The page is served by this server
            (Some("https://server.example"), Some("same-origin")),
            // Listed in cors_origins
            (Some(LISTED_ORIGIN), Some("cross-site")),
            // No Origin: a non-browser client
            (None, None),
        ] {
            let response =
                test::call_service(&app, websocket_upgrade(origin, sec_fetch_site).to_request())
                    .await;
            assert_eq!(
                response.status(),
                StatusCode::SWITCHING_PROTOCOLS,
                "{origin:?} ({sec_fetch_site:?}) should be accepted"
            );
        }
    }

    #[actix_web::test]
    async fn same_site_request_from_unlisted_origin_is_refused() {
        let app = test::init_service(release_app(true)).await;

        let preflight = |origin: &str| {
            test::TestRequest::default()
                .method(Method::OPTIONS)
                .uri("/graphql")
                .insert_header((header::ORIGIN, origin))
                .insert_header((header::ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .insert_header(("sec-fetch-site", "same-site"))
                .to_request()
        };

        let refused = test::call_service(&app, preflight("https://other.listed.example")).await;
        assert!(!refused.status().is_success());
        assert!(
            refused
                .headers()
                .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                .is_none()
        );

        // Listing the origin in cors_origins still allows it
        let allowed = test::call_service(&app, preflight(LISTED_ORIGIN)).await;
        assert!(allowed.status().is_success());
        assert_eq!(
            allowed.headers().get(header::ACCESS_CONTROL_ALLOW_ORIGIN),
            Some(&header::HeaderValue::from_static(LISTED_ORIGIN))
        );
    }
}
