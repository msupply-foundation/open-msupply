use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::ItemRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
pub struct ItemRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl ItemRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> ItemRepository {
        ItemRepository { pool }
    }

    pub async fn insert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(item)
            .values(item_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item.load(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }

    pub async fn find_one_by_id(&self, item_id: &str) -> Result<ItemRow, RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item.filter(id.eq(item_id)).first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
