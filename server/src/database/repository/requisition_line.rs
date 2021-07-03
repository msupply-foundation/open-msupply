use crate::database::repository::Repository;
use crate::database::schema::RequisitionLineRow;

#[derive(Clone)]
pub struct RequisitionLineRepository {
    pool: sqlx::PgPool,
}

impl Repository for RequisitionLineRepository {}

impl RequisitionLineRepository {
    pub fn new(pool: sqlx::PgPool) -> RequisitionLineRepository {
        RequisitionLineRepository { pool }
    }

    pub async fn insert_one(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO requisition_line (id, requisition_id, item_id, actual_quantity, suggested_quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            requisition_line.id,
            requisition_line.requisition_id,
            requisition_line.item_id,
            requisition_line.actual_quantity,
            requisition_line.suggested_quantity
	)
	.execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<RequisitionLineRow, sqlx::Error> {
        let requisition_line = sqlx::query_as!(
            RequisitionLineRow,
            r#"
            SELECT id, requisition_id, item_id, actual_quantity, suggested_quantity
            FROM requisition_line
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(requisition_line)
    }

    pub async fn find_many_by_requisition_id(
        &self,
        requisition_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, sqlx::Error> {
        let requisition_lines = sqlx::query_as!(
            RequisitionLineRow,
            r#"
            SELECT id, requisition_id, item_id, actual_quantity, suggested_quantity
            FROM requisition_line
            WHERE requisition_id = $1
            "#,
            requisition_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(requisition_lines)
    }
}
