pub struct Authorization(String);

pub static AUTHORIZATION_HEADER: &str = "authorization";

impl std::fmt::Display for Authorization {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl actix_web::FromRequest for Authorization {
    type Error = actix_web::Error;
    type Future = futures_util::future::Ready<Result<Self, actix_web::Error>>;
    type Config = ();

    fn from_request(
        req: &actix_web::HttpRequest,
        _payload: &mut actix_web::dev::Payload,
    ) -> Self::Future {
        let headers = req.headers();
        if headers.contains_key(AUTHORIZATION_HEADER) {
            // TODO: this is really ugly!
            let authorization = headers
                .get(AUTHORIZATION_HEADER)
                .unwrap()
                .to_str()
                .unwrap()
                .to_string();
            futures_util::future::ok(Authorization(authorization))
        } else {
            futures_util::future::ok(Authorization(String::from("")))
        }
    }
}
