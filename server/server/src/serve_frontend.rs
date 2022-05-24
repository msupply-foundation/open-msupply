use actix_web::{get, http::header::ContentType, web::Data, HttpRequest, HttpResponse, Responder};
use mime_guess::{from_path, mime};
use rust_embed::RustEmbed;

use crate::discovery::ServerInfo;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../client/packages/host/dist"]
struct Asset;

// https://github.com/pyrossh/rust-embed/blob/master/examples/actix.rs
fn server_frontend(path: &str) -> HttpResponse {
    match Asset::get(path) {
        Some(content) => HttpResponse::Ok()
            .content_type(from_path(path).first_or_octet_stream().as_ref())
            .body(content.data.into_owned()),
        None => HttpResponse::NotFound().body("file not found"),
    }
}

// Match file paths (ending  ($) with dot (\.) and at least one character (.+) )
#[get(r#"/{filename:.*\..+$}"#)]
async fn file(req: HttpRequest) -> impl Responder {
    let filename: String = req.match_info().query("filename").parse().unwrap();
    server_frontend(&filename)
}

// Match all paths
#[get("/{_:.*}")]
async fn index(_: HttpRequest) -> impl Responder {
    server_frontend("index.html")
}

// Config js, to replace API_HOST with server IP
// Ideally would use something like conforma f/e but capacitor mobile f/e build might fail to deduce server url from window.url
// https://github.com/openmsupply/application-manager-web-app/blob/develop/src/config.ts
#[get("/config.js")]
async fn config_js(server_info: Data<ServerInfo>, _: HttpRequest) -> HttpResponse {
    HttpResponse::Ok()
        .content_type(ContentType(mime::APPLICATION_JAVASCRIPT))
        .body(format!(
            // Double curly escapes curly
            "window.env = {{ API_HOST: '{}' }};",
            server_info.as_url()
        ))
}

pub fn config_server_frontend(
    server_info: ServerInfo,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        cfg.app_data(Data::new(server_info))
            .service(config_js)
            .service(file)
            .service(index);
    }
}
