use super::{
    form_schema_row::form_schema, report_row::report::dsl as report_dsl, StorageConnection,
};

use crate::repository_error::RepositoryError;
use crate::{Delete, Upsert};
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportType {
    OmSupply,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportContext {
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
}

table! {
  report (id) {
      id -> Text,
      name -> Text,
      #[sql_name = "type"] type_ -> crate::db_diesel::report_row::ReportTypeMapping,
      template -> Text,
      context -> crate::db_diesel::report_row::ReportContextMapping,
      comment -> Nullable<Text>,
      sub_context -> Nullable<Text>,
      argument_schema_id -> Nullable<Text>,
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
    pub context: ReportContext,
    pub comment: Option<String>,
    pub sub_context: Option<String>,
    pub argument_schema_id: Option<String>,
}

impl Default for ReportRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            r#type: ReportType::OmSupply,
            template: Default::default(),
            context: ReportContext::InboundShipment,
            comment: Default::default(),
            sub_context: Default::default(),
            argument_schema_id: Default::default(),
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
        let result = report_dsl::report
            .filter(report_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::insert_into(report_dsl::report)
            .values(row)
            .on_conflict(report_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::replace_into(report_dsl::report)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(report_dsl::report.filter(report_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ReportRowDelete(pub String);
impl Delete for ReportRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ReportRowRepository::new(con).delete(&self.0)
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
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ReportRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ReportRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
