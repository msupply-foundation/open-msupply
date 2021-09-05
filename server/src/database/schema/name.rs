use super::diesel_schema::name_table;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "name_table"]
pub struct NameRow {
    pub id: String,
    pub name: String,
}
