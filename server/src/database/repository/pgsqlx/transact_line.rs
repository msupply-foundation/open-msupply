use crate::database::repository::{
    PgSqlxRepository, Repository, RepositoryError, TransactLineRepository,
};
use crate::database::schema::{TransactLineRow, TransactLineRowType};

use async_trait::async_trait;

#[derive(Clone)]
pub struct TransactLinePgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for TransactLinePgSqlxRepository {}
impl PgSqlxRepository for TransactLinePgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> TransactLinePgSqlxRepository {
        TransactLinePgSqlxRepository { pool }
    }
}

#[async_trait]
impl TransactLineRepository for TransactLinePgSqlxRepository {
    async fn insert_one(&self, transact_line: &TransactLineRow) -> Result<(), RepositoryError> {
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

    async fn find_one_by_id(&self, id: &str) -> Result<TransactLineRow, RepositoryError> {
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

    async fn find_many_by_transact_id(
        &self,
        transact_id: &str,
    ) -> Result<Vec<TransactLineRow>, RepositoryError> {
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
