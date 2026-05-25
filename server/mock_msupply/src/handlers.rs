//! V5 endpoint handlers. Response shapes mirror those the real legacy
//! mSupply server would return — pinned to the deserialisers in
//! `server/service/src/sync/api/*.rs` so a schema change there breaks
//! something visible here. Bodies returned are the minimum to keep the
//! OMS central + remote happy for the file-upload test path: created
//! sites are tracked, get_site_info is consistent, and all other sync
//! endpoints answer "nothing to do".

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use serde::Serialize;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::state::{MockState, SiteRecord};

// Real legacy mSupply doesn't require Content-Type: application/json on V5
// POSTs, and `SyncApiV5::do_post` doesn't set it either — it just calls
// reqwest's `.body(...)`. So we accept the raw bytes here and only parse
// JSON if we actually care about the payload (we don't, for create_site —
// `visibleNameIds` is ignored).

#[derive(Serialize)]
struct CreateSiteResponseSite {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "site_ID")]
    site_id: i32,
    name: String,
    password: String,
}

#[derive(Serialize)]
struct CreateSiteResponseStore {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
}

#[derive(Serialize)]
struct CreateSiteResponse {
    site: CreateSiteResponseSite,
    store: CreateSiteResponseStore,
}

pub async fn create_site(
    state: web::Data<MockState>,
    _body: web::Bytes,
) -> impl Responder {
    let site_id = state.alloc_site_id();
    // Use a recognisable, unique name so concurrent test invocations don't
    // collide on the by-name lookup.
    let name = format!("mock-site-{}", site_id);
    let raw_password = format!("password-{}", site_id);
    let password_sha256 = {
        let mut h = Sha256::new();
        h.update(raw_password.as_bytes());
        format!("{:x}", h.finalize())
    };
    let record = SiteRecord {
        id: uuid::Uuid::new_v4().to_string(),
        site_id,
        name: name.clone(),
        password_sha256: password_sha256.clone(),
        store_id: uuid::Uuid::new_v4().to_string(),
        name_id: uuid::Uuid::new_v4().to_string(),
    };
    state.insert_site(record.clone());

    HttpResponse::Ok().json(CreateSiteResponse {
        site: CreateSiteResponseSite {
            id: record.id,
            site_id: record.site_id,
            name: record.name,
            // Real mSupply returns the sha256 hash, not the plain password.
            password: record.password_sha256,
        },
        store: CreateSiteResponseStore {
            id: record.store_id,
            name_id: record.name_id,
        },
    })
}

#[derive(Serialize)]
struct SiteInfoResponse {
    id: String,
    #[serde(rename = "siteId")]
    site_id: i32,
    #[serde(rename = "initialisationStatus")]
    initialisation_status: &'static str,
    #[serde(rename = "omSupplyCentralServerUrl")]
    central_server_url: String,
    #[serde(rename = "isOmSupplyCentralServer")]
    is_central_server: bool,
    #[serde(rename = "mSupplyCentralSiteId")]
    msupply_central_site_id: i32,
}

pub async fn get_site(state: web::Data<MockState>, req: HttpRequest) -> impl Responder {
    let (username, password_sha256) = parse_basic_auth(&req).unwrap_or_default();
    let site = state.get_or_create_by_name(&username, &password_sha256);

    let is_central = site.name == state.config.oms_central_username;
    HttpResponse::Ok().json(SiteInfoResponse {
        id: site.id,
        site_id: site.site_id,
        initialisation_status: "completed",
        central_server_url: if is_central {
            String::new()
        } else {
            state.config.oms_central_url.clone()
        },
        is_central_server: is_central,
        msupply_central_site_id: state.config.msupply_central_site_id,
    })
}

pub async fn get_site_status() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "code": "idle",
        "message": "idle",
        "data": null,
    }))
}

pub async fn post_initialise() -> impl Responder {
    HttpResponse::Ok().json(json!({ "queueLength": 0 }))
}

pub async fn get_queued_records() -> impl Responder {
    HttpResponse::Ok().json(json!({ "queueLength": 0, "data": [] }))
}

pub async fn post_queued_records() -> impl Responder {
    HttpResponse::Ok().json(json!({ "integrationStarted": false }))
}

pub async fn post_acknowledged_records() -> impl Responder {
    HttpResponse::NoContent().finish()
}

pub async fn get_central_records() -> impl Responder {
    HttpResponse::Ok().json(json!({ "maxCursor": 0, "data": [] }))
}

pub async fn post_test_upsert() -> impl Responder {
    HttpResponse::Ok().finish()
}

pub async fn post_test_delete() -> impl Responder {
    HttpResponse::Ok().finish()
}

fn parse_basic_auth(req: &HttpRequest) -> Option<(String, String)> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let header = req.headers().get(actix_web::http::header::AUTHORIZATION)?;
    let encoded = header.to_str().ok()?.strip_prefix("Basic ")?;
    let decoded = STANDARD.decode(encoded).ok()?;
    let text = String::from_utf8(decoded).ok()?;
    let (user, pass) = text.split_once(':')?;
    Some((user.to_string(), pass.to_string()))
}
