use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum IndicatorValueType {
    #[serde(rename = "string")]
    String,
    #[serde(rename = "number")]
    #[default]
    Number,
}

table! {
    indicator_line (id) {
        id -> Text,
        program_indicator_id -> Text,
        line_number -> Integer,
        description->Text,
        code -> Text,
        value_type -> Nullable<crate::IndicatorValueTypeMapping>,
        default_value -> Text,
        is_required -> Bool,
        is_active -> Bool,
    }
}

#[derive(Clone, Eq, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = indicator_line)]
pub struct IndicatorLineRow {
    pub id: String,
    pub program_indicator_id: String,
    pub line_number: i32,
    pub description: String,
    pub code: String,
    pub value_type: Option<IndicatorValueType>,
    pub default_value: String,
    pub is_required: bool,
    pub is_active: bool,
}

pub struct IndicatorLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorLineRowRepository { connection }
    }

    fn _upsert_one(&self, row: &IndicatorLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(indicator_line::table)
            .values(row)
            .on_conflict(indicator_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &IndicatorLineRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = IndicatorLineRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_indicator_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::program_indicator_id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for IndicatorLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        IndicatorLineRowRepository::new(con)._upsert_one(self)?;

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

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
