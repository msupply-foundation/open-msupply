use std::future::{Ready, ready};

use actix_web::{
    Error, HttpResponse,
    body::{BoxBody, EitherBody},
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    http::{
        StatusCode,
        header::{self, HeaderValue},
    },
    web::Data,
};
use futures_util::future::LocalBoxFuture;
use service::{service_provider::ServiceProvider, sync::is_initialised_or_log};

/// Answers 503 with `message` until this site's first sync has integrated. That sync commits in
/// batches (#845), so until it finishes the data is partial and routes that read or write it must
/// not be live.
#[derive(Debug)]
pub(crate) struct InitialisedOnly {
    pub(crate) message: &'static str,
}

impl<S, B> Transform<S, ServiceRequest> for InitialisedOnly
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = InitialisedOnlyMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(InitialisedOnlyMiddleware {
            service,
            message: self.message,
        }))
    }
}

#[derive(Debug)]
pub struct InitialisedOnlyMiddleware<S> {
    service: S,
    message: &'static str,
}

impl<S, B> Service<ServiceRequest> for InitialisedOnlyMiddleware<S>
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
        let is_initialised = req
            .app_data::<Data<ServiceProvider>>()
            .is_some_and(|service_provider| is_initialised_or_log(service_provider));
        if !is_initialised {
            return reject(req, StatusCode::SERVICE_UNAVAILABLE, self.message);
        }

        let fut = self.service.call(req);
        Box::pin(async move { fut.await.map(ServiceResponse::map_into_left_body) })
    }
}

pub(crate) fn reject<B: 'static>(
    req: ServiceRequest,
    status: StatusCode,
    message: &'static str,
) -> LocalBoxFuture<'static, Result<ServiceResponse<EitherBody<B>>, Error>> {
    Box::pin(async move {
        Ok(req.into_response({
            let mut resp = HttpResponse::new(status);
            resp.headers_mut()
                .append(header::CONNECTION, HeaderValue::from_static("close"));
            resp.map_body(|_head, _body| BoxBody::new(message))
                .map_into_right_body()
        }))
    })
}
