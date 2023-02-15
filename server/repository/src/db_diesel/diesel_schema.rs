use super::{
    invoice_line::invoice_stats, invoice_line_row::invoice_line, invoice_row::invoice,
    item_row::item, location_row::location, master_list_line_row::master_list_line,
    master_list_name_join::master_list_name_join, master_list_row::master_list, name_row::name,
    name_store_join::name_store_join, requisition_line_row::requisition_line,
    requisition_row::requisition, stock_line_row::stock_line, stocktake_line_row::stocktake_line,
    stocktake_row::stocktake, store_row::store, unit_row::unit, user_row::user_account,
};

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
    stocktake,
    stocktake_line,
    master_list,
);
