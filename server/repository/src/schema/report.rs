use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ReportType {
    PPro,
    Grep,
    OmReport,
}

table! {
  report (id) {
      id -> Text,
      name -> Text,
      #[sql_name = "type"] type_ -> crate::schema::report::ReportTypeMapping,
  }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "report"]
pub struct ReportRow {
    pub id: String,
    pub name: String,
    #[column_name = "type_"]
    pub r#type: ReportType,
}
