use crate::database::repository::RepositoryError;
use crate::database::schema::StoreRow;

#[derive(Clone)]
pub struct StoreRepository {
    pool: sqlx::PgPool,
}

impl StoreRepository {
    pub fn new(pool: sqlx::PgPool) -> StoreRepository {
        StoreRepository { pool }
    }

    pub async fn insert_one(&self, store: &StoreRow) -> Result<(), RepositoryError> {
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

    pub async fn find_one_by_id(&self, id: &str) -> Result<StoreRow, RepositoryError> {
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

    pub async fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StoreRow>, RepositoryError> {
        let stores = sqlx::query_as!(
            StoreRow,
            r#"
            SELECT id, name_id
            FROM store
            WHERE id = ANY($1)
            "#,
            ids
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(stores)
    }
}
