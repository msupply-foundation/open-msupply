use crate::database::repository::RepositoryError;
use crate::database::schema::{ItemRow, ItemRowType};

#[derive(Clone)]
pub struct ItemRepository {
    pool: sqlx::PgPool,
}

impl ItemRepository {
    pub fn new(pool: sqlx::PgPool) -> ItemRepository {
        ItemRepository { pool }
    }

    pub async fn insert_one(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO item (id, item_name, type_of)
            VALUES ($1, $2, $3)
            "#,
            item.id,
            item.item_name,
            item.type_of.clone() as ItemRowType,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<ItemRow, RepositoryError> {
        let item = sqlx::query_as!(
            ItemRow,
            r#"
            SELECT id, item_name, type_of AS "type_of!: ItemRowType"
            FROM item
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(item)
    }
}
