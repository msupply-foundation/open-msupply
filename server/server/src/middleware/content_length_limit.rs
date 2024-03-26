use std::future::{ready, Ready};

use actix_web::{
    body::EitherBody,
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    http::StatusCode,
    Error, HttpResponse,
};
use futures_util::future::LocalBoxFuture;
use futures_util::TryStreamExt;

static DEFAULT_MAX_UPLOAD_SIZE_BYTES: u64 = 100 * 1024 * 1024; // 100MB

#[derive(Debug)]
pub struct ContentLengthLimit {
    pub limit_bytes: u64,
}

impl Default for ContentLengthLimit {
    fn default() -> Self {
        Self {
            limit_bytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for ContentLengthLimit
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = ContentLengthLimitMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ContentLengthLimitMiddleware {
            service,
            limit_bytes: self.limit_bytes,
        }))
    }
}

#[derive(Debug)]
pub struct ContentLengthLimitMiddleware<S> {
    service: S,
    limit_bytes: u64,
}

impl<S, B> Service<ServiceRequest> for ContentLengthLimitMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let content_length = match req.headers().get("content-length") {
            None => 0,
            Some(content_length) => match content_length.to_str() {
                Ok(content_length) => content_length.parse::<u64>().unwrap_or(0),
                Err(_) => 0,
            },
        };

        if content_length >= self.limit_bytes {
            // Request is too large, we'll throw it away.
            // https://stackoverflow.com/a/73186551/4493704 explains the need to drain the request body, even when we are returning a 413 - PAYLOAD_TOO_LARGE error

            return Box::pin(async move {
                // Drain the request body
                let (_, payload) = req.parts_mut();

                while let Ok(Some(_)) = payload.try_next().await {}

                Ok(req.into_response(
                    HttpResponse::new(StatusCode::PAYLOAD_TOO_LARGE).map_into_right_body(),
                ))
            });
        }

        // Request is small enough, we'll pass it on.
        let fut = self.service.call(req);

        Box::pin(async move { fut.await.map(ServiceResponse::map_into_left_body) })
    }
}
