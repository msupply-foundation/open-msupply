use crate::database::repository::RepositoryError;
use crate::database::schema::NameRow;

#[derive(Clone)]
pub struct NameRepository {
    pool: sqlx::PgPool,
}

impl NameRepository {
    pub fn new(pool: sqlx::PgPool) -> NameRepository {
        NameRepository { pool }
    }

    pub async fn insert_one(&self, name: &NameRow) -> Result<(), RepositoryError> {
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

    pub async fn find_one_by_id(&self, id: &str) -> Result<NameRow, RepositoryError> {
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
