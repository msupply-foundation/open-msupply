//! src/routes/requisition.rs
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(serde::Deserialize)]
pub struct RequisitionData {
    id: Uuid,
    from_id: Uuid,
    to_id: Uuid,
}

pub async fn post_requisition(
    requisition: web::Form<RequisitionData>,
    connection_pool: web::Data<PgPool>,
) -> Result<HttpResponse, HttpResponse> {
    let request_id = Uuid::new_v4();
    log::info!(
        "request_id {} - Adding new requisition '{}' from '{}' to '{}'",
        request_id,
        requisition.id,
        requisition.from_id,
        requisition.to_id,
    );
    log::info!(
        "request_id {} - Saving new requisition details in the database",
        request_id
    );
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
        log::error!(
            "request_id {} - Failed to execute query: {:?}",
            request_id,
            e
        );
        HttpResponse::InternalServerError().finish()
    })?;
    log::info!(
        "request_id {} - New requisition details in the database have been saved",
        request_id
    );
    Ok(HttpResponse::Ok().finish())
}
