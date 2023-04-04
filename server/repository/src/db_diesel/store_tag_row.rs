use super::{store_tag_row::store_tag::dsl as store_tag_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    store_tag (id) {
        id -> Text,
        store_id -> Text,
        tag_name -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "store_tag"]
pub struct StoreTagRow {
    pub id: String,
    pub store_id: String,
    pub tag_name: String,
}

pub struct StoreTagRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StoreTagRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreTagRowRepository { connection }
    }

    pub async fn insert_one(&self, store_row: &StoreTagRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_tag_dsl::store_tag)
            .values(store_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_many_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<StoreTagRow>, RepositoryError> {
        let result = store_tag_dsl::store_tag
            .filter(store_tag_dsl::store_id.eq(store_id))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_tag_name(
        &self,
        tag_name: &str,
    ) -> Result<Vec<StoreTagRow>, RepositoryError> {
        let result = store_tag_dsl::store_tag
            .filter(store_tag_dsl::tag_name.eq(tag_name))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_store_id_and_tag_name(
        &self,
        store_id: &str,
        tag_name: &str,
    ) -> Result<Option<StoreTagRow>, RepositoryError> {
        let result = store_tag_dsl::store_tag
            .filter(store_tag_dsl::store_id.eq(store_id))
            .filter(store_tag_dsl::tag_name.eq(tag_name))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(store_tag_dsl::store_tag.filter(store_tag_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
