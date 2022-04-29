use super::pricing::invoice_stats;
use crate::db_diesel::{
    invoice_line_row::invoice_line,
    invoice_row::invoice,
    item_row::{item, item_is_visible},
    location_row::location,
    master_list_line_row::master_list_line,
    master_list_name_join::master_list_name_join,
    master_list_row::master_list,
    name_row::name,
    name_store_join::name_store_join,
    requisition_line_row::requisition_line,
    requisition_row::requisition,
    stock_line_row::stock_line,
    stocktake_line_row::stocktake_line,
    stocktake_row::stocktake,
    store_row::store,
    unit_row::unit,
    user_row::user_account,
};

table! {
    central_sync_buffer (id) {
        id -> Integer,
        table_name -> Text,
        record_id -> Text,
        data -> Text,
    }
}

table! {
    remote_sync_buffer (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        action -> crate::schema::remote_sync_buffer::RemoteSyncBufferActionMapping,
        data -> Text,
    }
}

table! {
    sync_out (id) {
        id -> Text,
        created_at -> Date,
        table_name -> crate::schema::sync_out::SyncOutRowTableNameTypeMapping,
        record_id -> Text,
        store_id -> Text,
        site_id -> Integer,
        action -> crate::schema::sync_out::SyncOutRowActionTypeMapping,
    }
}

joinable!(item -> unit (unit_id));
joinable!(stock_line -> item (item_id));
joinable!(stock_line -> store (store_id));
joinable!(stock_line -> location (location_id));
joinable!(requisition -> name (name_id));
joinable!(requisition -> store (store_id));
joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));
joinable!(store -> name (name_id));
joinable!(sync_out -> store (store_id));
joinable!(invoice -> name (name_id));
joinable!(invoice -> store (store_id));
joinable!(invoice_line -> item (item_id));
joinable!(invoice_line -> stock_line (stock_line_id));
joinable!(invoice_line -> invoice (invoice_id));
joinable!(invoice_line -> location (location_id));
joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_line -> item (item_id));

joinable!(item_is_visible -> item (id));
joinable!(location -> store (store_id));
joinable!(stocktake_line -> location (location_id));
joinable!(stocktake_line -> stocktake (stocktake_id));
joinable!(stocktake_line -> stock_line (stock_line_id));
joinable!(requisition -> user_account (user_id));
joinable!(invoice -> user_account (user_id));
joinable!(stocktake -> user_account (user_id));

allow_tables_to_appear_in_same_query!(
    unit,
    location,
    item,
    stock_line,
    name,
    requisition,
    requisition_line,
    store,
    invoice,
    invoice_line,
    invoice_stats,
    user_account,
    name_store_join,
    master_list_line,
    master_list_name_join,
    item_is_visible,
    stocktake,
    stocktake_line,
);
