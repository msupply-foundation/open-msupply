use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ChangelogAction {
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    Stocktake,
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ChangelogRow {
    pub id: i64,
    pub table_name: ChangelogTableName,
    pub row_id: String,
    pub row_action: ChangelogAction,
}
