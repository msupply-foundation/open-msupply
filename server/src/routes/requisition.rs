//! src/routes/requisition.rs
use actix_web::{web, HttpResponse};
use uuid::Uuid;
use sqlx::PgPool;

#[derive(serde::Deserialize)]
pub struct RequisitionData {
    id: Uuid,
    from_id: Uuid,
    to_id: Uuid
}

pub async fn post_requisition(
    requisition: web::Form<RequisitionData>,
    connection_pool: web::Data<PgPool>,
) -> Result<HttpResponse, HttpResponse> {
    sqlx::query!(
        r#"
        INSERT INTO requisition (id, from_id, to_id)
        VALUES ($1, $2, $3)
        "#,
        requisition.id,
        requisition.from_id,
        requisition.to_id
    )
    .execute(connection_pool.get_ref())
    .await
    .map_err(|e| {
        eprintln!("Failed to execute query: {}", e);
        HttpResponse::InternalServerError().finish()
    })?;
    Ok(HttpResponse::Ok().finish())
}