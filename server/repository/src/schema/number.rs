use super::diesel_schema::number;

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "number"]
pub struct NumberRow {
    pub id: String,
    pub value: i64,
}
