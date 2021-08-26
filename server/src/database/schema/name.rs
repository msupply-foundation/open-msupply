use super::diesel_schema::name_table;

#[derive(Clone, Queryable, Insertable)]
#[table_name = "name_table"]
pub struct NameRow {
    pub id: String,
    pub name: String,
}
