use super::diesel_schema::location;

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "location"]
pub struct LocationRow {
    pub id: String,
    pub code: String,
    pub name: String,
    pub on_hold: bool,
}
