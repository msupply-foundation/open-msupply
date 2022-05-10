use crate::settings::Settings;
use actix_cors::Cors;
use actix_web::http::header;

pub fn cors_policy(config_settings: &Settings) -> Cors {
    let cors = if config_settings.server.develop && config_settings.server.debug_cors_permissive {
        Cors::permissive()
    } else {
        let mut cors = Cors::default()
            .supports_credentials()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::ACCEPT,
                header::CONTENT_TYPE,
            ])
            .max_age(3600);
        for origin in config_settings.server.cors_origins.iter() {
            cors = cors.allowed_origin(origin);
        }
        cors = cors.allowed_origin_fn(|_header, req| {
            //allow requests where Sec-Fetch-Site is set to same-origin, same-site or none
            let sec_fetch_site_header = req
                .headers
                .get("Sec-Fetch-Site")
                .map(header::HeaderValue::as_bytes);

            match sec_fetch_site_header {
                None => false,
                Some(bytes) => match bytes {
                    b"cross-site" => false,
                    b"same-origin" => true,
                    b"same-site" => true,
                    b"none" => true,
                    _ => false,
                },
            }
        });
        cors
    };
    cors
}
