table! {
    item (id) {
        id -> Text,
        item_name -> Text,
        type_of -> crate::database::schema::item::ItemRowTypeMapping,
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

allow_tables_to_appear_in_same_query!(
    item,
    item_line,
    name_table,
    requisition,
    requisition_line,
    store,
    sync_out,
    transact,
    transact_line,
    user_account,
);
