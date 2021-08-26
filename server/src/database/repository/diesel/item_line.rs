use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::ItemLineRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
pub struct ItemLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl ItemLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        ItemLineRepository { pool }
    }

    pub async fn insert_one(&self, item_line_row: &ItemLineRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::item_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(item_line)
            .values(item_line_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, item_line_id: &str) -> Result<ItemLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::item_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item_line
            .filter(id.eq(item_line_id))
            //.select((id, item_id, store_id, batch, quantity))
            .first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
