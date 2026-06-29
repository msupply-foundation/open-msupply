use super::property_option_v2_row::property_option_v2::dsl::*;

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
    property_option_v2 (id) {
        id -> Text,
        property_id -> Text,
        key -> Text,
        name -> Text,
        parent_option_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

use super::property_v2_row::property_v2;
joinable!(property_option_v2 -> property_v2 (property_id));
allow_tables_to_appear_in_same_query!(property_option_v2, property_v2);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_option_v2)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyOptionV2Row {
    pub id: String,
    pub property_id: String,
    pub key: String,
    pub name: String,
    pub parent_option_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct PropertyOptionV2RowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyOptionV2RowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyOptionV2RowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyOptionV2Row) -> Result<(), RepositoryError> {
        diesel::insert_into(property_option_v2)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyOptionV2Row) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyOptionV2Row::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyOptionV2Row>, RepositoryError> {
        let result = property_option_v2.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<PropertyOptionV2Row>, RepositoryError> {
        let result = property_option_v2
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PropertyOptionV2Row>, RepositoryError> {
        Ok(property_option_v2::table
            .filter(property_option_v2::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Used by the `PropertyV2Node.options` GraphQL dataloader to batch
    /// option lookups across many properties in a single request. Soft-deleted
    /// options are excluded; rows are ordered by `id` for deterministic UI.
    pub fn find_many_by_property_ids(
        &self,
        property_ids: &[String],
    ) -> Result<Vec<PropertyOptionV2Row>, RepositoryError> {
        Ok(property_option_v2::table
            .filter(property_option_v2::property_id.eq_any(property_ids))
            .filter(property_option_v2::deleted_datetime.is_null())
            .order(property_option_v2::id.asc())
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for PropertyOptionV2Row {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyOptionV2RowRepository::new(con)._upsert_one(self)?;

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
            PropertyOptionV2RowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
