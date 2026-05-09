use super::{
    store_row::store, ChangelogRepository, RowActionType, RowOrId, StorageConnection,
};
use crate::{
    diesel_macros::diesel_string_enum, ChangelogSyncType, RepositoryError, SourceSiteId, Upsert,
};
use ts_rs::TS;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, TS, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[PgType = "sync_message_status"]
pub enum SyncMessageRowStatus {
    #[default]
    New,
    Processed,
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, TS)]
    pub enum SyncMessageRowType {
        #[default]
        RequestFieldChange,
        NameMerge,
        ItemMerge,
        ClinicianMerge,
        // `Other` is the catch-all variant: lets older sites tolerate values
        // added by newer central servers and preserves the raw string verbatim.
        // `#[serde(untagged)]` keeps the legacy wire format (the variant
        // serializes as the inner string, not as `{"Other": "..."}`).
        @catchall
        #[serde(untagged)]
        Other(String),
    }
}

table! {
    sync_message (id) {
        id -> Text,
        to_store_id -> Nullable<Text>,
        from_store_id -> Nullable<Text>,
        body -> Text,
        created_datetime -> Timestamp,
        status -> crate::db_diesel::sync_message_row::SyncMessageRowStatusMapping,
        #[sql_name = "type"]
        type_ -> Text,
        error_message -> Nullable<Text>,
    }
}

joinable!(sync_message -> store (to_store_id));
allow_tables_to_appear_in_same_query!(sync_message, store);

#[derive(
    Clone, Queryable, Insertable, Debug, PartialEq, AsChangeset, Default, Serialize, Deserialize, TS,
)]
#[diesel(table_name = sync_message)]
pub struct SyncMessageRow {
    pub id: String,
    #[ts(optional)]
    pub to_store_id: Option<String>,
    #[ts(optional)]
    pub from_store_id: Option<String>,
    pub body: String,
    pub created_datetime: NaiveDateTime,
    pub status: SyncMessageRowStatus,
    #[diesel(column_name = type_)]
    pub r#type: SyncMessageRowType,
    #[ts(optional)]
    pub error_message: Option<String>,
}
pub struct SyncMessageRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncMessageRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncMessageRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &SyncMessageRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_message::table)
            .values(row.clone())
            .on_conflict(sync_message::id)
            .do_update()
            .set(row.clone())
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &SyncMessageRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = SyncMessageRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SyncMessageRow>, RepositoryError> {
        let result = sync_message::table
            .filter(sync_message::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SyncMessageRow>, RepositoryError> {
        Ok(sync_message::table
            .filter(sync_message::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for SyncMessageRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SyncMessageRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                RowOrId::Row(self),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SyncMessageRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use util::assert_variant;

    use crate::{
        mock::{mock_store_a, MockDataInserts},
        test_db::{setup_test, SetupOption, SetupResult},
    };

    use super::*;

    #[actix_rt::test]
    async fn message_type() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "message_type",
            inserts: MockDataInserts::none().names().stores(),
            ..Default::default()
        })
        .await;

        let message = SyncMessageRow {
            id: "message1".to_string(),
            to_store_id: Some(mock_store_a().id.clone()),
            r#type: SyncMessageRowType::Other("SomethingNotInTheEnum".to_string()),
            ..Default::default()
        };
        SyncMessageRowRepository::new(&connection)
            .upsert_one(&message)
            .unwrap();

        let found_message = assert_variant!(SyncMessageRowRepository::new(&connection).find_one_by_id(&message.id), Ok(Some(msg)) => msg);
        assert_eq!(
            found_message.r#type,
            SyncMessageRowType::Other("SomethingNotInTheEnum".to_string())
        );

        let message = SyncMessageRow {
            id: "message2".to_string(),
            r#type: SyncMessageRowType::RequestFieldChange,
            ..message
        };
        SyncMessageRowRepository::new(&connection)
            .upsert_one(&message)
            .unwrap();

        let found_message = assert_variant!(SyncMessageRowRepository::new(&connection).find_one_by_id(&message.id), Ok(Some(msg)) => msg);
        assert_eq!(found_message.r#type, SyncMessageRowType::RequestFieldChange);
    }
}
