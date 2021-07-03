use crate::database::repository::Repository;
use crate::database::schema::{TransactLineRow, TransactLineRowType};

#[derive(Clone)]
pub struct TransactLineRepository {
    pool: sqlx::PgPool,
}

impl Repository for TransactLineRepository {}

impl TransactLineRepository {
    pub fn new(pool: sqlx::PgPool) -> TransactLineRepository {
        TransactLineRepository { pool }
    }

    pub async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO transact_line (id, transact_id, type_of, item_id, item_line_id)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            transact_line.id,
            transact_line.transact_id,
            transact_line.type_of.clone() as TransactLineRowType,
            transact_line.item_id,
            transact_line.item_line_id,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, sqlx::Error> {
        let transact_line: TransactLineRow = sqlx::query_as!(
            TransactLineRow,
            r#"
            SELECT id, transact_id, type_of AS "type_of!: TransactLineRowType", item_id, item_line_id
            FROM transact_line
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(transact_line)
    }

    pub async fn find_many_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<TransactLineRow>, sqlx::Error> {
        let transact_lines: Vec<TransactLineRow> = sqlx::query_as!(
            TransactLineRow,
            r#"
            SELECT id, transact_id, type_of AS "type_of!: TransactLineRowType", item_id, item_line_id
            FROM transact_line
            WHERE transact_id = $1
            "#,
            transact_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(transact_lines)
    }
}
