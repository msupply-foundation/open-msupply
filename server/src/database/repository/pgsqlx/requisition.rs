use crate::database::repository::{
    PgSqlxRepository, Repository, RepositoryError, RequisitionRepository,
};
use crate::database::schema::{RequisitionRow, RequisitionRowType};

use async_trait::async_trait;

#[derive(Clone)]
pub struct RequisitionPgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for RequisitionPgSqlxRepository {}
impl PgSqlxRepository for RequisitionPgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> RequisitionPgSqlxRepository {
        RequisitionPgSqlxRepository { pool }
    }
}

#[async_trait]
impl RequisitionRepository for RequisitionPgSqlxRepository {
    async fn insert_one(&self, requisition: &RequisitionRow) -> Result<(), RepositoryError> {
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

    async fn find_one_by_id(&self, id: &str) -> Result<RequisitionRow, RepositoryError> {
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
