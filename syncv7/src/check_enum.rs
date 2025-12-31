use diesel::prelude::*;

use crate::dynamic_queries::diesel_string_enum;

table! {
    check (id) {
        id -> Text,
        site_id -> Bigint,
        name -> Text,
    }
}

diesel_string_enum! {
    pub enum Name {
        #[default]
        Item,
        Invoice,
    }
}

#[derive(Debug, PartialEq, Queryable, Insertable, AsChangeset, Default)]
#[diesel(table_name = check)]
pub struct ChangeLogRow {
    pub id: String,
    pub site_id: i64,
    #[diesel(deserialize_as = String)]
    pub name: Name,
}
