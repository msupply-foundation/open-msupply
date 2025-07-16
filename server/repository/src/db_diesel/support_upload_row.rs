use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    support_upload(id) {
        id -> Text,
        created_datetime -> Timestamp,
        store_id -> Text,
        title -> Text,
        status -> crate::db_diesel::support_upload_row::SupportUploadStatusMapping,
        upload_start_datetime -> Timestamp,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SupportUploadStatus {
    #[default]
    Pending,
    InProgress,
    Completed,
    Failed,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = support_upload)]
pub struct SupportUploadRow {
    pub id: String,
    pub created_datetime: NaiveDateTime,
    pub store_id: String,
    pub title: String,
    pub status: SupportUploadStatus,
    pub upload_start_datetime: NaiveDateTime,
}

pub struct SupportUploadRowRepository<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SupportUploadRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SupportUploadRowRepository { connection }
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::SupportUpload,
            record_id: row_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn upsert_one(&self, row: &SupportUploadRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(support_upload::table)
            .values(row)
            .on_conflict(support_upload::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    pub fn find_one_by_id(
        &self,
        support_upload_id: &str,
    ) -> Result<Option<SupportUploadRow>, RepositoryError> {
        let result = support_upload::table
            .filter(support_upload::id.eq(support_upload_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_by_store_id(&self, s_id: &str) -> Result<Vec<SupportUploadRow>, RepositoryError> {
        let result = support_upload::table
            .filter(support_upload::store_id.eq(s_id))
            .load::<SupportUploadRow>(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for SupportUploadRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = SupportUploadRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SupportUploadRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
