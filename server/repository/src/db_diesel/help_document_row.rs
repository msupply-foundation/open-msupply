use super::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, StorageConnection};
use crate::{repository_error::RepositoryError, RowActionType, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    help_document (id) {
        id -> Text,
        title -> Text,
        created_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = help_document)]
pub struct HelpDocumentRow {
    pub id: String,
    pub title: String,
    pub created_datetime: NaiveDateTime,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct HelpDocumentRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> HelpDocumentRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        HelpDocumentRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &HelpDocumentRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(help_document::table)
            .values(row)
            .on_conflict(help_document::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::HelpDocument,
            record_id: uid.to_string(),
            row_action: action,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<HelpDocumentRow>, RepositoryError> {
        let result = help_document::table
            .filter(help_document::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, id: &str) -> Result<i64, RepositoryError> {
        diesel::update(help_document::table.filter(help_document::id.eq(id)))
            .set(help_document::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        // Soft delete propagates as an Upsert changelog so remotes see the new
        // `deleted_datetime` value and stop listing the row.
        self.insert_changelog(id, RowActionType::Upsert)
    }
}

impl Upsert for HelpDocumentRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = HelpDocumentRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            HelpDocumentRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
