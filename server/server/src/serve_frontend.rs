use actix_web::{get,  web::{ServiceConfig}, HttpRequest, HttpResponse, Responder};
use mime_guess::{from_path, };
use rust_embed::RustEmbed;

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

pub fn config_server_frontend(cfg: &mut ServiceConfig) {
    cfg.service(file).service(index);
}
