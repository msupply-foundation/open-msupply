use super::{TestSyncPullRecord, TestSyncPushRecord};

pub(crate) mod activity_log;
pub(crate) mod inventory_adjustment_reason;
pub(crate) mod invoice;
pub(crate) mod invoice_line;
pub(crate) mod item;
pub(crate) mod location;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_store_join;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod special;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod store_preference;
pub(crate) mod unit;

pub(crate) fn get_all_pull_upsert_central_test_records() -> Vec<TestSyncPullRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut item::test_pull_upsert_records());
    test_records.append(&mut master_list_line::test_pull_upsert_records());
    test_records.append(&mut master_list_name_join::test_pull_upsert_records());
    test_records.append(&mut master_list::test_pull_upsert_records());
    test_records.append(&mut name::test_pull_upsert_records());
    test_records.append(&mut report::test_pull_upsert_records());
    test_records.append(&mut store::test_pull_upsert_records());
    test_records.append(&mut unit::test_pull_upsert_records());
    test_records.append(&mut inventory_adjustment_reason::test_pull_upsert_records());
    test_records.append(&mut store_preference::test_pull_upsert_records());
    // Central but site specific
    test_records.append(&mut name_store_join::test_pull_upsert_records());
    test_records.append(&mut special::name_to_name_store_join::test_pull_upsert_records());
    test_records
}

pub(crate) fn get_all_pull_upsert_remote_test_records() -> Vec<TestSyncPullRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut location::test_pull_upsert_records());
    test_records.append(&mut requisition_line::test_pull_upsert_records());
    test_records.append(&mut requisition::test_pull_upsert_records());
    test_records.append(&mut stock_line::test_pull_upsert_records());
    test_records.append(&mut stocktake_line::test_pull_upsert_records());
    test_records.append(&mut stocktake::test_pull_upsert_records());
    test_records.append(&mut invoice_line::test_pull_upsert_records());
    test_records.append(&mut invoice::test_pull_upsert_records());
    test_records.append(&mut activity_log::test_pull_upsert_records());
    test_records
}

pub(crate) fn get_all_pull_delete_central_test_records() -> Vec<TestSyncPullRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut unit::test_pull_delete_records());
    test_records.append(&mut item::test_pull_delete_records());
    test_records.append(&mut master_list_line::test_pull_delete_records());
    test_records.append(&mut master_list_name_join::test_pull_delete_records());
    test_records.append(&mut master_list::test_pull_delete_records());
    test_records.append(&mut name::test_pull_delete_records());
    test_records.append(&mut report::test_pull_delete_records());
    test_records.append(&mut store::test_pull_delete_records());
    test_records.append(&mut unit::test_pull_delete_records());
    // Central but site specific
    test_records.append(&mut name_store_join::test_pull_delete_records());
    test_records
}

pub(crate) fn get_all_pull_delete_remote_test_records() -> Vec<TestSyncPullRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut requisition::test_pull_delete_records());
    test_records.append(&mut requisition_line::test_pull_delete_records());
    test_records.append(&mut invoice::test_pull_delete_records());
    test_records.append(&mut invoice_line::test_pull_delete_records());

    test_records
}

pub(crate) fn get_all_push_test_records() -> Vec<TestSyncPushRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut name::test_push_records());
    test_records.append(&mut location::test_push_records());
    test_records.append(&mut requisition_line::test_push_records());
    test_records.append(&mut requisition::test_push_records());
    test_records.append(&mut stock_line::test_push_records());
    test_records.append(&mut stocktake_line::test_push_records());
    test_records.append(&mut stocktake::test_push_records());
    test_records.append(&mut invoice_line::test_push_records());
    test_records.append(&mut invoice::test_push_records());
    test_records.append(&mut activity_log::test_push_records());

    test_records
}
