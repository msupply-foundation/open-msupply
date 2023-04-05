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

    pub fn upsert_tags_for_store(&self, new_tags: &StoreTags) -> Result<(), RepositoryError> {
        // Find current tags for store
        let current_tags = self.find_all_by_store_id(&new_tags.store_id)?;

        // Find all tags that need to be deleted
        let tag_ids_to_delete: Vec<String> = current_tags
            .iter()
            .filter(|existing_tag| {
                !new_tags
                    .tags
                    .iter()
                    .any(|new_tag| existing_tag.tag_name == *new_tag)
            })
            .map(|existing_tag| existing_tag.id.clone())
            .collect();

        // Delete old tags
        self.delete_many_by_id(tag_ids_to_delete)?;

        // Add any new tags
        let store_id = new_tags.store_id.clone();
        for tag_name in new_tags.tags.iter() {
            if current_tags
                .iter()
                .any(|existing_tag| existing_tag.tag_name == *tag_name)
            {
                // Tag already exists, nothing to add to db
                continue;
            }

            let store_tag_row = StoreTagRow {
                id: format!("{}_{}", store_id.clone(), tag_name),
                store_id: store_id.clone(),
                tag_name: tag_name.to_string(),
            };
            self.insert_one(&store_tag_row)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod test_store_tag_row {
    use crate::{
        test_db, NameRow, NameRowRepository, StoreRow, StoreRowRepository, StoreTagRow,
        StoreTagRowRepository, StoreTags,
    };

    fn tags_match(expected: Vec<String>, actual: Vec<StoreTagRow>) -> Result<bool, String> {
        let tag_names: Vec<String> = actual.iter().map(|tag| tag.tag_name.clone()).collect();
        if expected != tag_names {
            return Err(format!(
                "Expected tags: {:?}, Actual tags: {:?}",
                expected, tag_names
            ));
        }
        Ok(true)
    }

    #[actix_rt::test]
    async fn test_store_tag_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-test_store_tag_repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRowRepository::new(&connection)
            .insert_one(&NameRow {
                id: "name1".to_string(),
                name: "name1".to_string(),
                code: "name1".to_string(),
                ..Default::default()
            })
            .await
            .unwrap();

        StoreRowRepository::new(&connection)
            .insert_one(&StoreRow {
                id: "store1".to_string(),
                name_id: "name1".to_string(),
                ..Default::default()
            })
            .await
            .unwrap();

        /* TESTS */

        let repo = StoreTagRowRepository::new(&connection);

        // Check we can insert a store tag
        let store_tag_row = StoreTagRow {
            id: "store1_tag1".to_string(),
            store_id: "store1".to_string(),
            tag_name: "tag1".to_string(),
        };

        repo.insert_one(&store_tag_row).unwrap();

        // Check we can find a store tag by id
        let found_store_tag = StoreTagRowRepository::new(&connection)
            .find_one_by_id(&store_tag_row.id)
            .unwrap();
        assert_eq!(found_store_tag, Some(store_tag_row));

        // Check that the store tag list is upserted correctly with the same list of tags
        let store_tags = StoreTags {
            store_id: "store1".to_string(),
            tags: vec!["tag1".to_string()],
        };
        repo.upsert_tags_for_store(&store_tags).unwrap();

        let current_tags = repo.find_all_by_store_id(&store_tags.store_id).unwrap();
        assert!(tags_match(store_tags.tags, current_tags).unwrap());

        // Check that the store tag list is upserted correctly when we add 1 tag
        let store_tags = StoreTags {
            store_id: "store1".to_string(),
            tags: vec!["tag1".to_string(), "tag2".to_string()],
        };
        repo.upsert_tags_for_store(&store_tags).unwrap();
        let current_tags = repo.find_all_by_store_id(&store_tags.store_id).unwrap();
        assert!(tags_match(store_tags.tags, current_tags).unwrap());

        // Check that the store tag list is upserted correctly when we remove 1 tag
        let store_tags = StoreTags {
            store_id: "store1".to_string(),
            tags: vec!["tag2".to_string()],
        };
        repo.upsert_tags_for_store(&store_tags).unwrap();

        let current_tags = repo.find_all_by_store_id(&store_tags.store_id).unwrap();
        assert!(tags_match(store_tags.tags, current_tags).unwrap());

        // Check that the store tag list is upserted correctly when we remove all tags
        let store_tags = StoreTags {
            store_id: "store1".to_string(),
            tags: vec![],
        };
        repo.upsert_tags_for_store(&store_tags).unwrap();

        let current_tags = repo.find_all_by_store_id(&store_tags.store_id).unwrap();
        assert!(tags_match(store_tags.tags, current_tags).unwrap());
    }
}
