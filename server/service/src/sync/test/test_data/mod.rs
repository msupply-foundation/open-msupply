use super::{TestSyncPullRecord, TestSyncPushRecord};

pub(crate) mod item;
pub(crate) mod location;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_store_join;
pub(crate) mod number;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod trans_line;
pub(crate) mod transact;
pub(crate) mod unit;

pub(crate) fn get_all_pull_test_records() -> Vec<TestSyncPullRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut item::test_pull_records());
    test_records.append(&mut location::test_pull_records());
    test_records.append(&mut master_list_line::test_pull_records());
    test_records.append(&mut master_list_name_join::test_pull_records());
    test_records.append(&mut master_list::test_pull_records());
    test_records.append(&mut name_store_join::test_pull_records());
    test_records.append(&mut name::test_pull_records());
    test_records.append(&mut number::test_pull_records());
    test_records.append(&mut report::test_pull_records());
    test_records.append(&mut requisition_line::test_pull_records());
    test_records.append(&mut requisition::test_pull_records());
    test_records.append(&mut stock_line::test_pull_records());
    test_records.append(&mut stocktake_line::test_pull_records());
    test_records.append(&mut stocktake::test_pull_records());
    test_records.append(&mut store::test_pull_records());
    test_records.append(&mut trans_line::test_pull_records());
    test_records.append(&mut transact::test_pull_records());
    test_records.append(&mut unit::test_pull_records());

    test_records
}

pub(crate) fn get_all_push_test_records() -> Vec<TestSyncPushRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut location::test_push_records());
    test_records.append(&mut number::test_push_records());
    test_records.append(&mut requisition_line::test_push_records());
    test_records.append(&mut requisition::test_push_records());
    test_records.append(&mut stock_line::test_push_records());
    test_records.append(&mut stocktake_line::test_push_records());
    test_records.append(&mut stocktake::test_push_records());
    test_records.append(&mut trans_line::test_push_records());
    test_records.append(&mut transact::test_push_records());

    test_records
}
