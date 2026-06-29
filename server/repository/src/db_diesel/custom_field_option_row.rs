use super::custom_field_option_row::custom_field_option::dsl::*;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

table! {
    custom_field_option (id) {
        id -> Text,
        custom_field_id -> Text,
        key -> Text,
        name -> Text,
        parent_option_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

use super::custom_field_row::custom_field;
joinable!(custom_field_option -> custom_field (custom_field_id));
allow_tables_to_appear_in_same_query!(custom_field_option, custom_field);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = custom_field_option)]
#[diesel(treat_none_as_null = true)]
pub struct CustomFieldOptionRow {
    pub id: String,
    pub custom_field_id: String,
    pub key: String,
    pub name: String,
    pub parent_option_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct CustomFieldOptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomFieldOptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomFieldOptionRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &CustomFieldOptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(custom_field_option)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CustomFieldOptionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CustomFieldOptionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        let result = custom_field_option.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<CustomFieldOptionRow>, RepositoryError> {
        let result = custom_field_option
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        Ok(custom_field_option::table
            .filter(custom_field_option::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Used by the `CustomFieldNode.options` GraphQL dataloader to batch
    /// option lookups across many custom_fields in a single request. Soft-deleted
    /// options are excluded; rows are ordered by `id` for deterministic UI.
    pub fn find_many_by_custom_field_ids(
        &self,
        custom_field_ids: &[String],
    ) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        Ok(custom_field_option::table
            .filter(custom_field_option::custom_field_id.eq_any(custom_field_ids))
            .filter(custom_field_option::deleted_datetime.is_null())
            .order(custom_field_option::id.asc())
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for CustomFieldOptionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CustomFieldOptionRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CustomFieldOptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
