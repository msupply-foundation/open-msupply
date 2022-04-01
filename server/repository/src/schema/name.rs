use super::diesel_schema::name;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "name"]
pub struct NameRow {
    pub id: String,
    #[column_name = "name_"]
    pub name: String,
    pub code: String,
    pub is_customer: bool,
    pub is_supplier: bool,
    // TODO, this is temporary, remove
    pub legacy_record: String,
}
