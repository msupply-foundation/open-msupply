use super::diesel_schema::item;

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "item"]
pub struct ItemRow {
    pub id: String,
    pub name: String,
}
