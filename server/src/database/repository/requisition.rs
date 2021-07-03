use crate::database::repository::Repository;
use crate::database::schema::{RequisitionRow, RequisitionRowType};

#[derive(Clone)]
pub struct RequisitionRepository {
    pool: sqlx::PgPool,
}

impl Repository for RequisitionRepository {}

impl RequisitionRepository {
    pub fn new(pool: sqlx::PgPool) -> RequisitionRepository {
        RequisitionRepository { pool }
    }

    pub async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO requisition (id, name_id, store_id, type_of)
            VALUES ($1, $2, $3, $4)
            "#,
            requisition.id,
            requisition.name_id,
            requisition.store_id,
            requisition.type_of.clone() as RequisitionRowType
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, sqlx::Error> {
        let requisition = sqlx::query_as!(
            RequisitionRow,
            r#"
            SELECT id, name_id, store_id, type_of AS "type_of!: RequisitionRowType"
            FROM requisition
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(requisition)
    }
}
