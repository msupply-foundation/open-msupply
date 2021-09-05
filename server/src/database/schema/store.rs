use super::diesel_schema::store;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "store"]
pub struct StoreRow {
    pub id: String,
    pub name_id: String,
}
