use actix_web::http::StatusCode;
use actix_web::{
    get, http::header::ContentType, web::ServiceConfig, HttpRequest, HttpResponse, Responder,
};
use mime_guess::{from_path, mime};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../client/packages/host/dist"]
struct Asset;

const INDEX: &str = "index.html";

// https://github.com/pyrossh/rust-embed/blob/master/examples/actix.rs
fn serve_frontend(path: &str) -> HttpResponse {
    if let Some(content) = Asset::get(path) {
        return HttpResponse::Ok()
            .content_type(from_path(path).first_or_octet_stream().as_ref())
            .body(content.data.into_owned());
    }

    HttpResponse::NotFound().body("file not found")
}

// Match file paths (ending  ($) with dot (\.) and at least one character (.+) )
#[get(r#"/{filename:.*\..+$}"#)]
async fn file(req: HttpRequest) -> impl Responder {
    let filename: String = req.match_info().query("filename").parse().unwrap();
    serve_frontend(&filename)
}

// Match all paths
#[get("/{_:.*}")]
async fn index(_: HttpRequest) -> impl Responder {
    let result = serve_frontend(INDEX);

    // If index not found it's likely the front end was not built
    if result.status() == StatusCode::NOT_FOUND {
        HttpResponse::Ok()
            .content_type(ContentType(mime::TEXT_PLAIN))
            .body("Cannot find index.html. See https://github.com/openmsupply/open-msupply/tree/main/server#serving-front-end")
    } else {
        result
    }
}

pub fn config_serve_frontend(cfg: &mut ServiceConfig) {
    cfg.service(file).service(index);
}
