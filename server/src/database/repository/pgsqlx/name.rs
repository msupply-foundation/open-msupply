use crate::database::repository::{NameRepository, PgSqlxRepository, Repository, RepositoryError};
use crate::database::schema::NameRow;

use async_trait::async_trait;

#[derive(Clone)]
pub struct NamePgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for NamePgSqlxRepository {}
impl PgSqlxRepository for NamePgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> NamePgSqlxRepository {
        NamePgSqlxRepository { pool }
    }
}

#[async_trait]
impl NameRepository for NamePgSqlxRepository {
    async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO name (id, name)
            VALUES ($1, $2)
            "#,
            name.id,
            name.name
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError> {
        let name = sqlx::query_as!(
            NameRow,
            r#"
            SELECT id, name
            FROM name
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(name)
    }
}
