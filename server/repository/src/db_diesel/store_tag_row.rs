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

// StoreTags are used to upsert/replace a set of tags for a store
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StoreTags {
    pub store_id: String,
    pub tags: Vec<String>,
}

pub struct StoreTagRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StoreTagRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreTagRowRepository { connection }
    }

    pub fn insert_one(&self, store_tag_row: &StoreTagRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_tag_dsl::store_tag)
            .values(store_tag_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StoreTagRow>, RepositoryError> {
        let result = store_tag_dsl::store_tag
            .filter(store_tag_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_all_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<StoreTagRow>, RepositoryError> {
        let result = store_tag_dsl::store_tag
            .filter(store_tag_dsl::store_id.eq(store_id))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_all_by_tag_name(
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

    pub fn delete_all_for_store(&self, store_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(store_tag_dsl::store_tag.filter(store_tag_dsl::store_id.eq(store_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete_many_by_id(&self, ids: Vec<String>) -> Result<(), RepositoryError> {
        diesel::delete(store_tag_dsl::store_tag.filter(store_tag_dsl::id.eq_any(ids)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_tags_for_store(&self, store_tags: &StoreTags) -> Result<(), RepositoryError> {
        // Find all existing tags for store
        let existing_tags = self.find_all_by_store_id(&store_tags.store_id)?;

        // Find all tags that need to be deleted
        let tag_ids_to_delete: Vec<String> = existing_tags
            .iter()
            .filter(|existing_tag| {
                !store_tags
                    .tags
                    .iter()
                    .any(|tag| existing_tag.tag_name == *tag)
            })
            .map(|existing_tag| existing_tag.id.clone())
            .collect();

        // Delete old tags
        self.delete_many_by_id(tag_ids_to_delete)?;

        // Find all tags that need to be added
        let tags_to_add: Vec<String> = store_tags
            .tags
            .iter()
            .filter(|tag| {
                !existing_tags
                    .iter()
                    .any(|existing_tag| existing_tag.tag_name == **tag)
            })
            .cloned()
            .collect();

        // Add any new tags
        for tag_name in tags_to_add {
            let store_tag_row = StoreTagRow {
                id: format!("{}_{}", store_tags.store_id.clone(), tag_name),
                store_id: store_tags.store_id.clone(),
                tag_name,
            };
            self.insert_one(&store_tag_row)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod test_store_tag_row {}
