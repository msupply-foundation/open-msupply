use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogSyncType;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::Upsert;

use super::property_v2_row::property_v2;

table! {
    property_v2_option (id) {
        id -> Text,
        property_id -> Text,
        name -> Text,
        translation_key -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}
joinable!(property_v2_option -> property_v2 (property_id));
allow_tables_to_appear_in_same_query!(property_v2_option, property_v2);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_v2_option)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyV2OptionRow {
    pub id: String,
    pub property_id: String,
    pub name: String,
    pub translation_key: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct PropertyV2OptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2OptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2OptionRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyV2OptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_v2_option::table)
            .values(row)
            .on_conflict(property_v2_option::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyV2OptionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyV2OptionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        option_id: &str,
    ) -> Result<Option<PropertyV2OptionRow>, RepositoryError> {
        Ok(property_v2_option::table
            .filter(property_v2_option::id.eq(option_id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_by_property_id(
        &self,
        property_id: &str,
        include_deleted: bool,
    ) -> Result<Vec<PropertyV2OptionRow>, RepositoryError> {
        let mut query = property_v2_option::table
            .filter(property_v2_option::property_id.eq(property_id))
            .into_boxed();
        if !include_deleted {
            query = query.filter(property_v2_option::deleted_datetime.is_null());
        }
        Ok(query.load(self.connection.lock().connection())?)
    }

    pub fn mark_deleted(
        &self,
        option_id: &str,
        deleted_at: NaiveDateTime,
    ) -> Result<(), RepositoryError> {
        diesel::update(property_v2_option::table.filter(property_v2_option::id.eq(option_id)))
            .set(property_v2_option::deleted_datetime.eq(Some(deleted_at)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl PropertyV2OptionRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyV2Option,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl Upsert for PropertyV2OptionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyV2OptionRowRepository::new(con)._upsert_one(self)?;

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
            PropertyV2OptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
