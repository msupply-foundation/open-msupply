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
      #[sql_name = "type"] type_ -> crate::schema::report::ReportTypeMapping,
      data -> Text,
      context ->  crate::schema::report::ReportCategoryMapping,
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
