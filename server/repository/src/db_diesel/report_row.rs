use super::{
    form_schema_row::form_schema, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use clap::ValueEnum;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ValueEnum)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ContextType {
    Asset,
    InboundShipment,
    OutboundShipment,
    Requisition,
    Stocktake,
    /// Not an actual report but a resource entry used by other reports, e.g. to provide footers or
    /// logos
    Resource,
    Patient,
    Dispensary,
    Repack,
    OutboundReturn,
    InboundReturn,
    Report,
    Prescription,
}

table! {
  report (id) {
      id -> Text,
      name -> Text,
      template -> Text,
      context -> crate::db_diesel::report_row::ContextTypeMapping,
      comment -> Nullable<Text>,
      sub_context -> Nullable<Text>,
      argument_schema_id -> Nullable<Text>,
      is_custom -> Bool,
      version -> Text,
      code -> Text,
  }
}

joinable!(report -> form_schema (argument_schema_id));

allow_tables_to_appear_in_same_query!(report, form_schema);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize,
)]
#[diesel(table_name = report)]
pub struct ReportRow {
    pub id: String,
    pub name: String,
    pub template: String,
    /// Used to store the report context
    pub context: ContextType,
    pub comment: Option<String>,
    pub sub_context: Option<String>,
    pub argument_schema_id: Option<String>,
    pub is_custom: bool,
    pub version: String,
    pub code: String,
}

impl Default for ReportRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            template: Default::default(),
            context: ContextType::InboundShipment,
            comment: Default::default(),
            sub_context: Default::default(),
            argument_schema_id: Default::default(),
            is_custom: true,
            version: Default::default(),
            code: Default::default(),
        }
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Selectable)]
#[diesel(table_name = report)]
pub struct ReportMetaDataRow {
    pub id: String,
    pub is_custom: bool,
    pub version: String,
    pub code: String,
}

impl Default for ReportMetaDataRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            is_custom: true,
            version: Default::default(),
            code: Default::default(),
        }
    }
}

pub struct ReportRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReportRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReportRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReportRow>, RepositoryError> {
        let result = report::table
            .filter(report::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &ReportRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(report::table)
            .values(row)
            .on_conflict(report::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Report,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(report::table.filter(report::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ReportRowDelete(pub String);
impl Delete for ReportRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ReportRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ReportRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ReportRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = ReportRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log)) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ReportRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
