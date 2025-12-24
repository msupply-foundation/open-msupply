use super::StorageConnection;

use crate::{
    db_diesel::{master_list_row::master_list, name_tag_row::name_tag},
    diesel_macros::define_linked_tables,
    master_list_name_join::master_list_name_join,
    name_row::{name, name_oms_fields},
    name_store_join::name_store_join,
    name_tag_join::name_tag_join,
    program_requisition_settings_row::program_requisition_settings,
    program_row::program,
    StoreMode,
};

use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

define_linked_tables!(
    view: store_refactor = "store_view",
    core: store_row_with_links = "store",
    struct: StoreRowRefactor,
    repo: StoreRowRepositoryRefactor,
    shared: {
        code -> Text,
        site_id -> Integer,
        logo -> Nullable<Text>,
        store_mode -> crate::db_diesel::store_row::StoreModeMapping,
        created_date -> Nullable<Date>,
        is_disabled -> Bool,
    },
    links: {
        name_link_id -> name_id,
    }
);

joinable!(store_refactor -> name (name_id));
allow_tables_to_appear_in_same_query!(store_refactor, name);
allow_tables_to_appear_in_same_query!(store_refactor, name_oms_fields);
allow_tables_to_appear_in_same_query!(store_refactor, name_store_join);
allow_tables_to_appear_in_same_query!(store_refactor, master_list_name_join);
allow_tables_to_appear_in_same_query!(store_refactor, program);
allow_tables_to_appear_in_same_query!(store_refactor, master_list);
allow_tables_to_appear_in_same_query!(store_refactor, name_tag_join);
allow_tables_to_appear_in_same_query!(store_refactor, name_tag);
allow_tables_to_appear_in_same_query!(store_refactor, program_requisition_settings);

#[derive(
    Clone,
    Queryable,
    Insertable,
    Debug,
    PartialEq,
    Eq,
    AsChangeset,
    Default,
    Serialize,
    Deserialize,
    TS,
)]
#[diesel(table_name = store_refactor)]
pub struct StoreRowRefactor {
    pub id: String,
    pub code: String,
    pub site_id: i32,
    pub logo: Option<String>,
    pub store_mode: StoreMode,
    pub created_date: Option<NaiveDate>,
    pub is_disabled: bool,
    pub name_id: String,
}

pub struct StoreRowRepositoryRefactor<'a> {
    connection: &'a StorageConnection,
}
