use super::name_store_join::name_store_join;
use super::store::store;
use crate::db_diesel::{
    invoice_line_row::invoice_line,
    invoice_row::invoice,
    item_row::{item, item_is_visible},
    name_row::name,
    requisition_line_row::requisition_line,
    requisition_row::requisition,
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
    unit (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        index -> Integer,
    }
}

table! {
    location (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        on_hold -> Bool,
        store_id -> Text,
    }
}

table! {
    stock_line (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        location_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        pack_size -> Integer,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        available_number_of_packs -> Integer,
        total_number_of_packs -> Integer,
        expiry_date -> Nullable<Date>,
        on_hold -> Bool,
        note -> Nullable<Text>,
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

table! {
    invoice_stats (invoice_id) {
        invoice_id -> Text,
        total_before_tax -> Double,
        total_after_tax -> Double,
        stock_total_before_tax -> Double,
        stock_total_after_tax -> Double,
        service_total_before_tax -> Double,
        service_total_after_tax -> Double,
        tax_percentage -> Nullable<Double>,
    }
}

table! {
    user_account (id) {
        id -> Text,
        username -> Text,
        hashed_password -> Text,
        email -> Nullable<Text>,
    }
}

table! {
    master_list (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        description -> Text,
    }
}

table! {
    master_list_line (id) {
        id -> Text,
        item_id -> Text,
        master_list_id -> Text,
    }
}

table! {
    master_list_name_join (id) {
        id -> Text,
        master_list_id -> Text,
        name_id -> Text,
    }
}

table! {
    number (id) {
        id -> Text,
        value -> BigInt,
        store_id -> Text,
        #[sql_name = "type"] type_ -> crate::schema::number::NumberRowTypeMapping,
    }
}

table! {
    stocktake (id) {
        id -> Text,
        store_id -> Text,
        user_id -> Text,
        stocktake_number -> BigInt,
        comment	-> Nullable<Text>,
        description -> Nullable<Text>,
        status -> crate::schema::stocktake::StocktakeStatusMapping,
        created_datetime -> Timestamp,
        stocktake_date -> Nullable<Date>,
        finalised_datetime -> Nullable<Timestamp>,
        inventory_adjustment_id -> Nullable<Text>,
        is_locked -> Bool,
    }
}

table! {
    stocktake_line (id) {
        id -> Text,
        stocktake_id -> Text,
        stock_line_id -> Nullable<Text>,
        location_id	-> Nullable<Text>,
        comment	-> Nullable<Text>,
        snapshot_number_of_packs -> Integer,
        counted_number_of_packs -> Nullable<Integer>,

        // stock line related fields:
        item_id -> Text,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Nullable<Integer>,
        cost_price_per_pack -> Nullable<Double>,
        sell_price_per_pack -> Nullable<Double>,
        note -> Nullable<Text>,
    }
}

table! {
    changelog (id) {
        id -> BigInt,
        table_name -> crate::schema::changelog::ChangelogTableNameMapping,
        row_id -> Text,
        row_action -> crate::schema::changelog::ChangelogActionMapping,
    }
}

table! {
    changelog_deduped (id) {
        id -> BigInt,
        table_name -> crate::schema::changelog::ChangelogTableNameMapping,
        row_id -> Text,
        row_action -> crate::schema::changelog::ChangelogActionMapping,
    }
}

table! {
    stock_movement (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Integer,
        datetime -> Timestamp,
    }
}

table! {
    consumption (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Integer,
        date -> Date,
    }
}

table! {
    stock_on_hand (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        available_stock_on_hand -> BigInt,
    }
}

table! {
    key_value_store (id) {
        id -> crate::schema::key_value_store::KeyValueTypeMapping,
        value_string -> Nullable<Text>,
        value_int-> Nullable<Integer>,
        value_bigint-> Nullable<BigInt>,
        value_float-> Nullable<Double>,
        value_bool-> Nullable<Bool>,
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
joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name (name_id));
joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_line -> item (item_id));
joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name (name_id));
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
