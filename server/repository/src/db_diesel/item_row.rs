use super::StorageConnection;

use crate::{repository_error::RepositoryError, schema::ItemRow};

use diesel::prelude::*;

pub struct ItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;

        diesel::insert_into(item)
            .values(item_row)
            .on_conflict(id)
            .do_update()
            .set(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;
        diesel::replace_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;
        diesel::insert_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemRow>, RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;
        let result = item.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(&self, item_id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;
        let result = item
            .filter(id.eq(item_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ItemRow>, RepositoryError> {
        use crate::schema::diesel_schema::item::dsl::*;
        let result = item
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
