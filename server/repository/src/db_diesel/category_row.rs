use super::item_link_row::item_link;
use crate::{
    diesel_macros::define_batch_table, item_row::item, repository_error::RepositoryError,
    ChangelogRepository, RowActionType, SourceSiteId, StorageConnection,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;

define_batch_table! {
    struct: CategoryRow,
    repo: CategoryRowRepository,
    table: category (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        parent_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

allow_tables_to_appear_in_same_query!(category, item_link);
allow_tables_to_appear_in_same_query!(category, item);

#[derive(
    Clone,
    Insertable,
    Queryable,
    Debug,
    PartialEq,
    AsChangeset,
    Eq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
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

    pub(crate) fn _upsert_one(&self, category_row: &CategoryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(category::table)
            .values(category_row)
            .on_conflict(category::id)
            .do_update()
            .set(category_row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_one(&self, category_row: &CategoryRow) -> Result<(), RepositoryError> {
        self._upsert_one(category_row)?;
        let changelog = CategoryRow::generate_changelog(
            category_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<CategoryRow>, RepositoryError> {
        Ok(category::table
            .filter(category::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _mark_deleted(&self, category_id: &str) -> Result<(), RepositoryError> {
        diesel::update(category::table.filter(category::id.eq(category_id)))
            .set(category::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn mark_deleted(&self, category_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(category_id)?;
        let changelog = CategoryRow::generate_changelog(
            category_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(record_id)
    }
}
