use super::{form_schema_row::form_schema, StorageConnection};

use crate::repository_error::RepositoryError;
use crate::{Delete, Upsert};
use clap::ValueEnum;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportType {
    OmSupply,
}

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
      #[sql_name = "type"] type_ -> crate::db_diesel::report_row::ReportTypeMapping,
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

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[diesel(table_name = report)]
pub struct ReportRow {
    pub id: String,
    pub name: String,
    #[diesel(column_name = type_)]
    pub r#type: ReportType,
    /// The template format depends on the report type
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
            r#type: ReportType::OmSupply,
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

    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::insert_into(report::table)
            .values(row)
            .on_conflict(report::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
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
        ReportRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ReportRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

// impl<'de> Deserialize<'de> for ContextType {
//     fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
//     where
//         D: serde::Deserializer<'de>,
//     {
//         match Value::deserialize(deserializer).visit_string()? {
//             "Report" => Ok(ContextType::Report),
//             _ => Err(serde::de::Error::custom("Expected context type")),
//         }
//     }
// }

// impl Serialize for ContextType {
//     fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
//     where
//         S: serde::Serializer,
//     {
//         serializer.serialize_str(match self {
//             ContextType::Repack => todo!(),
//             ContextType::Asset => todo!(),
//             ContextType::InboundShipment => todo!(),
//             ContextType::OutboundShipment => todo!(),
//             ContextType::Requisition => todo!(),
//             ContextType::Stocktake => todo!(),
//             ContextType::Resource => todo!(),
//             ContextType::Patient => todo!(),
//             ContextType::Dispensary => todo!(),
//             ContextType::OutboundReturn => todo!(),
//             ContextType::InboundReturn => todo!(),
//             ContextType::Report => "report",
//         })
//     }
// }
