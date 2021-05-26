//! src/routes/requisition.rs
use actix_web::{web, HttpResponse};

#[derive(serde::Deserialize)]
pub struct RequisitionData {
    id: String,
    from_id: String,
    to_id: String,
}

pub async fn post_requisition(_requisition_data: web::Form<RequisitionData>) -> HttpResponse {
    HttpResponse::Ok().finish()
}