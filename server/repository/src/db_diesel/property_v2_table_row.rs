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
    property_v2_table (id) {
        id -> Text,
        property_id -> Text,
        table_name -> Text,
    }
}
joinable!(property_v2_table -> property_v2 (property_id));
allow_tables_to_appear_in_same_query!(property_v2_table, property_v2);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_v2_table)]
pub struct PropertyV2TableRow {
    pub id: String,
    pub property_id: String,
    // Service-layer-validated parent table name (e.g. "item", "name").
    pub table_name: String,
}

pub struct PropertyV2TableRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2TableRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2TableRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyV2TableRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_v2_table::table)
            .values(row)
            .on_conflict(property_v2_table::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyV2TableRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyV2TableRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyV2TableRow>, RepositoryError> {
        Ok(property_v2_table::table.load(self.connection.lock().connection())?)
    }

    pub fn find_by_property_id(
        &self,
        property_id: &str,
    ) -> Result<Vec<PropertyV2TableRow>, RepositoryError> {
        let result = property_v2_table::table
            .filter(property_v2_table::property_id.eq(property_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_by_table_name(
        &self,
        table_name: &str,
    ) -> Result<Vec<PropertyV2TableRow>, RepositoryError> {
        let result = property_v2_table::table
            .filter(property_v2_table::table_name.eq(table_name))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_v2_table::table.filter(property_v2_table::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl PropertyV2TableRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyV2Table,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl Upsert for PropertyV2TableRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyV2TableRowRepository::new(con)._upsert_one(self)?;

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
        let found = PropertyV2TableRowRepository::new(con).find_all().unwrap();
        assert!(found.iter().any(|r| r == self));
    }
}
