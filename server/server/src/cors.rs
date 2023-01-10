use actix_cors::Cors;
use actix_web::http::header;
use service::settings::{is_develop, Settings};

pub fn cors_policy(config_settings: &Settings) -> Cors {
    let cors = if is_develop() {
        Cors::permissive()
    } else {
        let mut cors = Cors::default()
            .supports_credentials()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::ACCEPT,
                header::CONTENT_TYPE,
                header::CONTENT_DISPOSITION,
            ])
            .max_age(3600);
        for origin in config_settings.server.cors_origins.iter() {
            cors = cors.allowed_origin(origin);
        }
        cors = cors.allowed_origin_fn(|_header, req| {
            //allow requests where Sec-Fetch-Site is set to same-origin, same-site or none
            let sec_fetch_site_header = req.headers.iter().find_map(|(name, value)| {
                (name.to_string().to_lowercase() == "sec-fetch-site").then(|| value.as_bytes())
            });

            match sec_fetch_site_header {
                Some(b"cross-site") => return true,
                Some(b"same-origin") => return true,
                Some(b"none") => return true,
                _ => {}
            };

            // Allow for android and electron
            // TODO restrict further (does this open up an attack vector ?)
            // This is required for API call during discovery (to get site name and initialisation status)
            let is_user_agent_allowed: Option<bool> =
                req.headers.iter().find_map(|(name, value)| {
                    (name == header::USER_AGENT).then(|| {
                        let value = value.to_str().unwrap();
                        value.contains("Electron") || value.contains("Android")
                    })
                });

            is_user_agent_allowed.unwrap_or(false)
        });
        cors
    };
    cors
}
