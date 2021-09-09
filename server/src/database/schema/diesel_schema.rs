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
  item {
    id -> Text,
    name -> Text,
  }
}

table! {
  #[sql_name = "name"]
  name_table {
    id -> Text,
    name -> Text,
  }
}

table! {
  requisition_line {
    id -> Text,
    requisition_id -> Text,
    item_id -> Text,
    actual_quantity -> Double,
    suggested_quantity -> Double,
  }
}

table! {
  requisition {
    id -> Text,
    name_id -> Text,
    store_id -> Text,
    type_of -> crate::database::schema::requisition::RequisitionRowTypeMapping,
  }
}

table! {
  store {
    id -> Text,
    name_id -> Text,
  }
}

table! {
  transact_line {
    id -> Text,
    transact_id -> Text,
    item_id -> Text,
    item_line_id -> Nullable<Text>,
    type_of -> crate::database::schema::transact_line::TransactLineRowTypeMapping,
  }
}

table! {
  transact {
    id -> Text,
    name_id -> Text,
    store_id -> Text,
    invoice_number -> Integer,
    type_of -> crate::database::schema::transact::TransactRowTypeMapping,
  }
}

table! {
  user_account {
    id -> Text,
    username -> Text,
    password -> Text,
    email -> Nullable<Text>,
  }
}
