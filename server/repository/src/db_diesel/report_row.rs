use super::{report_row::report::dsl as report_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportType {
    OmReport,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportCategory {
    Invoice,
    Requisition,
    Stocktake,
    /// Not an actual report but a resource entry used by other reports, e.g. to provide footers or
    /// logos
    Resource,
}

table! {
  report (id) {
      id -> Text,
      name -> Text,
      #[sql_name = "type"] type_ -> crate::db_diesel::report_row::ReportTypeMapping,
      data -> Text,
      context ->  crate::db_diesel::report_row::ReportCategoryMapping,
  }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "report"]
pub struct ReportRow {
    pub id: String,
    pub name: String,
    #[column_name = "type_"]
    pub r#type: ReportType,
    pub data: String,
    /// Used to store the report category
    pub context: ReportCategory,
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
            .first(&self.connection.connection)
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
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::replace_into(report_dsl::report)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
