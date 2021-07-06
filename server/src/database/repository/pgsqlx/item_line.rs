use crate::database::repository::{
    ItemLineRepository, PgSqlxRepository, Repository, RepositoryError,
};
use crate::database::schema::ItemLineRow;

use async_trait::async_trait;

#[derive(Clone)]
pub struct ItemLinePgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for ItemLinePgSqlxRepository {}
impl PgSqlxRepository for ItemLinePgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> ItemLinePgSqlxRepository {
        ItemLinePgSqlxRepository { pool }
    }
}

#[async_trait]
impl ItemLineRepository for ItemLinePgSqlxRepository {
    async fn insert_one(&self, item_line: &ItemLineRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO item_line (id, item_id, store_id, batch, quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            item_line.id,
            item_line.item_id,
            item_line.store_id,
            item_line.batch,
            item_line.quantity
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<ItemLineRow, RepositoryError> {
        let item_line = sqlx::query_as!(
            ItemLineRow,
            r#"
            SELECT id, item_id, store_id, batch, quantity
            from item_line
            where id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(item_line)
    }
}
