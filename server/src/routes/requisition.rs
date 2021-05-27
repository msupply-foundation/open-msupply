//! src/routes/requisition.rs
use actix_web::{web, HttpResponse};
use sqlx::PgPool;
use tracing_futures::Instrument;
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

    let request_span = tracing::info_span!(
        "Adding new requisition",
        %request_id,
        id = %requisition.id,
        from_id = %requisition.from_id,
        to_id = %requisition.to_id
    );

    let _request_span_guard = request_span.enter();

    let query_span = tracing::info_span!("Saving new requisition in the database",);

    sqlx::query!(
        r#"
        INSERT INTO requisition (id, from_id, to_id)
        VALUES ($1, $2, $3)
        "#,
        requisition.id,
        requisition.from_id,
        requisition.to_id
    )
    .execute(connection_pool.as_ref())
    .instrument(query_span)
    .await
    .map_err(|e| {
        tracing::error!("Failed to execute query: {:?}", e);
        HttpResponse::InternalServerError().finish()
    })?;

    Ok(HttpResponse::Ok().finish())
}
