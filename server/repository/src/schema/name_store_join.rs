table! {
    name_store_join (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
    }
}

#[derive(Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Clone, Default)]
#[table_name = "name_store_join"]
pub struct NameStoreJoinRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
}
