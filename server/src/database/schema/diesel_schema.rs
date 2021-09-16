table! {
    item (id) {
        id -> Text,
        name -> Text,
        code -> Text,
    }
}

table! {
    item_line (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        batch -> Text,
        quantity -> Double,
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
    transact (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        invoice_number -> Integer,
        type_of -> crate::database::schema::transact::TransactRowTypeMapping,
    }
}

table! {
    transact_line (id) {
        id -> Text,
        transact_id -> Text,
        item_id -> Text,
        item_line_id -> Nullable<Text>,
        type_of -> crate::database::schema::transact_line::TransactLineRowTypeMapping,
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
    central_sync_buffer (id) {
        id -> Text,
        cursor_id -> Integer,
        table_name -> Text,
        record_id -> Text,
        data -> Text,
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

joinable!(item_line -> item (item_id));
joinable!(item_line -> store (store_id));
joinable!(requisition -> name_table (name_id));
joinable!(requisition -> store (store_id));
joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));
joinable!(store -> name_table (name_id));
joinable!(sync_out -> store (store_id));
joinable!(transact -> name_table (name_id));
joinable!(transact -> store (store_id));
joinable!(transact_line -> item (item_id));
joinable!(transact_line -> item_line (item_line_id));
joinable!(transact_line -> transact (transact_id));
joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name_table (name_id));
joinable!(master_list_line -> master_list (master_list_id));
joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name_table (name_id));

allow_tables_to_appear_in_same_query!(
    item,
    item_line,
    name_table,
    requisition,
    requisition_line,
    store,
    central_sync_buffer,
    sync_out,
    transact,
    transact_line,
    user_account,
    name_store_join
);
