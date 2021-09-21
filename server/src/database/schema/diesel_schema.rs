table! {
    central_sync_buffer (id) {
        id -> Integer,
        table_name -> Text,
        record_id -> Text,
        data -> Text,
    }
}

table! {
    central_sync_cursor (id) {
        id -> Integer,
    }
}

table! {
    item (id) {
        id -> Text,
        name -> Text,
        code -> Text,
    }
}

table! {
    stock_line (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        batch -> Nullable<Text>,
        pack_size -> Integer,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        available_number_of_packs -> Integer,
        total_number_of_packs -> Integer,
        expiry_date -> Nullable<Text>,
    }
}

table! {
    #[sql_name = "name"]
    name_table (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        is_customer -> Bool,
        is_supplier -> Bool,
    }
}

table! {
    requisition (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        type_of -> crate::database::schema::requisition::RequisitionRowTypeMapping,
    }
}

table! {
    requisition_line (id) {
        id -> Text,
        requisition_id -> Text,
        item_id -> Text,
        actual_quantity -> Double,
        suggested_quantity -> Double,
    }
}

table! {
    store (id) {
        id -> Text,
        name_id -> Text,
        code -> Text,
    }
}

table! {
    sync_out (id) {
        id -> Text,
        created_at -> Date,
        table_name -> crate::database::schema::sync_out::SyncOutRowTableNameTypeMapping,
        record_id -> Text,
        store_id -> Text,
        site_id -> Integer,
        action -> crate::database::schema::sync_out::SyncOutRowActionTypeMapping,
    }
}

table! {
    invoice (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        invoice_number -> Integer,
        #[sql_name = "type"] type_ -> crate::database::schema::invoice::InvoiceRowTypeMapping,
        status -> crate::database::schema::invoice::InvoiceRowStatusMapping,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        entry_datetime -> Timestamp,
        confirm_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        invoice_id -> Text,
        item_id -> Text,
        stock_line_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Text>,
        pack_size -> Integer,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        available_number_of_packs -> Integer,
        total_number_of_packs -> Integer,
    }
}

table! {
    user_account (id) {
        id -> Text,
        username -> Text,
        password -> Text,
        email -> Nullable<Text>,
    }
}

table! {
    name_store_join (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
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

joinable!(stock_line -> item (item_id));
joinable!(stock_line -> store (store_id));
joinable!(requisition -> name_table (name_id));
joinable!(requisition -> store (store_id));
joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));
joinable!(store -> name_table (name_id));
joinable!(sync_out -> store (store_id));
joinable!(invoice -> name_table (name_id));
joinable!(invoice -> store (store_id));
joinable!(invoice_line -> item (item_id));
joinable!(invoice_line -> stock_line (stock_line_id));
joinable!(invoice_line -> invoice (invoice_id));
joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name_table (name_id));
joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_line -> item (item_id));
joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name_table (name_id));

allow_tables_to_appear_in_same_query!(
    central_sync_buffer,
    central_sync_cursor,
    item,
    stock_line,
    name_table,
    requisition,
    requisition_line,
    store,
    sync_out,
    invoice,
    invoice_line,
    user_account,
    name_store_join,
    master_list_line,
    master_list_name_join
);
