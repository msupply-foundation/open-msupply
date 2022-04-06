table! {
    store (id) {
        id -> Text,
        name_id -> Text,
        code -> Text,
        site_id -> Integer,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "store"]
pub struct StoreRow {
    pub id: String,
    pub name_id: String,
    pub code: String,
    pub site_id: i32,
}
