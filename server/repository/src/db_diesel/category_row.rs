use crate::{repository_error::RepositoryError, Delete, StorageConnection, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    category (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        parent_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = category)]
pub struct CategoryRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct CategoryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CategoryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CategoryRowRepository { connection }
    }

    pub fn upsert_one(&self, category_row: &CategoryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(category::table)
            .values(category_row)
            .on_conflict(category::id)
            .do_update()
            .set(category_row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        category_id: &str,
    ) -> Result<Option<CategoryRow>, RepositoryError> {
        let result = category::table
            .filter(category::id.eq(category_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, category_id: &str) -> Result<(), RepositoryError> {
        diesel::update(category::table.filter(category::id.eq(category_id)))
            .set(category::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }
}

impl Upsert for CategoryRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        CategoryRowRepository::new(con).upsert_one(self)?;
        // Not in changelog
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
#[derive(Debug, Clone)]
pub struct CategoryRowDelete(pub String);
impl Delete for CategoryRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        CategoryRowRepository::new(con).mark_deleted(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            CategoryRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(CategoryRow {
                deleted_datetime: Some(_),
                ..
            })) | Ok(None)
        ));
    }
}
