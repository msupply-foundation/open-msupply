use crate::database::repository::{PgSqlxRepository, Repository, RepositoryError, StoreRepository};
use crate::database::schema::StoreRow;

use async_trait::async_trait;

#[derive(Clone)]
pub struct StorePgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for StorePgSqlxRepository {}
impl PgSqlxRepository for StorePgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> StorePgSqlxRepository {
        StorePgSqlxRepository { pool }
    }
}

#[async_trait]
impl StoreRepository for StorePgSqlxRepository {
    async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO store (id, name_id)
            VALUES ($1, $2)
            "#,
            store.id,
            store.name_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError> {
        let store = sqlx::query_as!(
            StoreRow,
            r#"
            SELECT id, name_id
            FROM store
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(store)
    }
}
