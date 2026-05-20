use chrono::NaiveDate;
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

use super::property_v2_option_row::property_v2_option;
use super::property_v2_row::property_v2;

table! {
    property_v2_value (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        property_id -> Text,
        value_text -> Nullable<Text>,
        value_real -> Nullable<Double>,
        value_date -> Nullable<Date>,
        value_number -> Nullable<Integer>,
        value_option_id -> Nullable<Text>,
    }
}
joinable!(property_v2_value -> property_v2 (property_id));
joinable!(property_v2_value -> property_v2_option (value_option_id));
allow_tables_to_appear_in_same_query!(property_v2_value, property_v2);
allow_tables_to_appear_in_same_query!(property_v2_value, property_v2_option);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_v2_value)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyV2ValueRow {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub property_id: String,
    pub value_text: Option<String>,
    pub value_real: Option<f64>,
    pub value_date: Option<NaiveDate>,
    pub value_number: Option<i32>,
    pub value_option_id: Option<String>,
}

pub struct PropertyV2ValueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2ValueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2ValueRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyV2ValueRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_v2_value::table)
            .values(row)
            .on_conflict(property_v2_value::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyV2ValueRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyV2ValueRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    // Upsert keyed by the (table_name, record_id, property_id) triple — the
    // logical unique identity of a property value. Re-setting overwrites in place.
    pub fn upsert_by_record(&self, row: &PropertyV2ValueRow) -> Result<(), RepositoryError> {
        let existing = property_v2_value::table
            .filter(property_v2_value::table_name.eq(&row.table_name))
            .filter(property_v2_value::record_id.eq(&row.record_id))
            .filter(property_v2_value::property_id.eq(&row.property_id))
            .select(property_v2_value::id)
            .first::<String>(self.connection.lock().connection())
            .optional()?;

        let to_insert = match existing {
            Some(existing_id) => PropertyV2ValueRow {
                id: existing_id,
                ..row.clone()
            },
            None => row.clone(),
        };
        self.upsert_one(&to_insert)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PropertyV2ValueRow>, RepositoryError> {
        Ok(property_v2_value::table
            .filter(property_v2_value::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_by_record(
        &self,
        table_name: &str,
        record_id: &str,
    ) -> Result<Vec<PropertyV2ValueRow>, RepositoryError> {
        Ok(property_v2_value::table
            .filter(property_v2_value::table_name.eq(table_name))
            .filter(property_v2_value::record_id.eq(record_id))
            .load(self.connection.lock().connection())?)
    }

    // Batch lookup used by graphql DataLoaders.
    pub fn find_by_records(
        &self,
        table_name: &str,
        record_ids: &[String],
    ) -> Result<Vec<PropertyV2ValueRow>, RepositoryError> {
        if record_ids.is_empty() {
            return Ok(vec![]);
        }
        Ok(property_v2_value::table
            .filter(property_v2_value::table_name.eq(table_name))
            .filter(property_v2_value::record_id.eq_any(record_ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_by_record_and_property(
        &self,
        table_name: &str,
        record_id: &str,
        property_id: &str,
    ) -> Result<Option<PropertyV2ValueRow>, RepositoryError> {
        Ok(property_v2_value::table
            .filter(property_v2_value::table_name.eq(table_name))
            .filter(property_v2_value::record_id.eq(record_id))
            .filter(property_v2_value::property_id.eq(property_id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_v2_value::table.filter(property_v2_value::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl PropertyV2ValueRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyV2Value,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl Upsert for PropertyV2ValueRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyV2ValueRowRepository::new(con)._upsert_one(self)?;

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
            PropertyV2ValueRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
