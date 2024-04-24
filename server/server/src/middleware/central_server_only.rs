use std::future::{ready, Ready};

use actix_web::{
    body::{BoxBody, EitherBody},
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    http::{
        header::{self, HeaderValue},
        StatusCode,
    },
    Error, HttpResponse,
};
use futures_util::future::LocalBoxFuture;
use service::sync::CentralServerConfig;

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
            return Box::pin(async move {
                Ok(req.into_response({
                    let mut resp = HttpResponse::new(StatusCode::METHOD_NOT_ALLOWED);
                    resp.headers_mut()
                        .append(header::CONNECTION, HeaderValue::from_static("close"));
                    resp.map_body(|_head, _body| {
                        BoxBody::new("Method only allowed on central server.")
                    })
                    .map_into_right_body()
                }))
            });
        }

        // Pass on the request to the next service
        let fut = self.service.call(req);

        Box::pin(async move { fut.await.map(ServiceResponse::map_into_left_body) })
    }
}
