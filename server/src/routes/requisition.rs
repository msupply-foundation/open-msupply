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

#[tracing::instrument(
    name = "Adding new requisition",
    skip(requisition, pool),
    fields(
        id = %requisition.id,
        from_id = %requisition.from_id,
        to_id = %requisition.to_id
    )
)]
#[tracing::instrument(
    name = "Saving new requisition in the database",
    skip(requisition, pool)
)]

pub async fn insert_requisition(
    pool: &PgPool,
    requisition: &RequisitionData,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO requisition (id, from_id, to_id)
        VALUES ($1, $2, $3)
        "#,
        requisition.id,
        requisition.from_id,
        requisition.to_id
    )
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to execute query: {:?}", e);
        e
    })?;
    Ok(())
}

pub async fn post_requisition(
    requisition: web::Form<RequisitionData>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, HttpResponse> {
    insert_requisition(&pool, &requisition)
        .await
        .map_err(|_| HttpResponse::InternalServerError().finish())?;
    Ok(HttpResponse::Ok().finish())
}
