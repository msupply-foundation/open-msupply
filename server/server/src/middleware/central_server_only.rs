use std::future::{Ready, ready};

use actix_web::{
    Error,
    body::EitherBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    http::StatusCode,
};
use futures_util::future::LocalBoxFuture;
use service::sync::CentralServerConfig;

use super::initialised_only::reject;

#[derive(Debug, Default)]
pub(crate) struct CentralServerOnly {}

impl<S, B> Transform<S, ServiceRequest> for CentralServerOnly
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = CentralServerOnlyMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CentralServerOnlyMiddleware { service }))
    }
}

#[derive(Debug)]
pub struct CentralServerOnlyMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for CentralServerOnlyMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        if !CentralServerConfig::is_central_server() {
            // We're not the central server, so we'll return an error.
            return reject(
                req,
                StatusCode::METHOD_NOT_ALLOWED,
                "Method only allowed on central server.",
            );
        }

        // Pass on the request to the next service
        let fut = self.service.call(req);

        Box::pin(async move { fut.await.map(ServiceResponse::map_into_left_body) })
    }
}

#[cfg(test)]
mod tests {
    use actix_web::{
        App, HttpResponse,
        http::StatusCode,
        test,
        web::{self, Data},
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use service::{
        service_provider::ServiceProvider,
        sync::{test_util_set_is_central_server, test_util_set_is_initialised},
    };

    use crate::middleware::{central_server_only, initialised_only};

    // Wrapped as `config_central` does: the last wrap runs first, so not-central (405) is checked
    // before not-initialised (503).
    async fn central_route_status(service_provider: &Data<ServiceProvider>) -> StatusCode {
        let app = test::init_service(
            App::new().app_data(service_provider.clone()).service(
                web::scope("central")
                    .wrap(initialised_only("Central server is still initialising"))
                    .wrap(central_server_only())
                    .route("/ping", web::get().to(HttpResponse::Ok)),
            ),
        )
        .await;
        let request = test::TestRequest::get().uri("/central/ping").to_request();
        test::call_service(&app, request).await.status()
    }

    // A central integrates its first sync in batches (#845), so remotes must not reach its
    // `/central` routes until that sync has finished.
    #[actix_web::test]
    async fn central_routes_wait_for_initialisation() {
        let (_, _, connection_manager, _) = setup_all(
            "central_routes_wait_for_initialisation",
            MockDataInserts::none(),
        )
        .await;
        let service_provider = Data::new(ServiceProvider::new(connection_manager));

        test_util_set_is_central_server(false);
        assert_eq!(
            central_route_status(&service_provider).await,
            StatusCode::METHOD_NOT_ALLOWED
        );

        // Central, but no sync log yet, so not initialised.
        test_util_set_is_central_server(true);
        assert_eq!(
            central_route_status(&service_provider).await,
            StatusCode::SERVICE_UNAVAILABLE
        );

        test_util_set_is_initialised(true);
        assert_eq!(
            central_route_status(&service_provider).await,
            StatusCode::OK
        );
    }
}
