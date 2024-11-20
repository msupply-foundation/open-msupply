use self::special::name_to_name_store_join;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

pub(crate) mod activity_log;
pub(crate) mod asset;
pub(crate) mod asset_catalogue_item;
pub(crate) mod asset_category;
pub(crate) mod asset_class;
pub(crate) mod asset_log;
pub(crate) mod asset_log_reason;
pub(crate) mod asset_property;
pub(crate) mod asset_type;
pub(crate) mod barcode;
pub(crate) mod cold_storage_type;
pub(crate) mod currency;
pub(crate) mod demographic;
pub(crate) mod indicator_attribute;
pub(crate) mod indicator_value;
pub(crate) mod invoice;
pub(crate) mod invoice_line;
pub(crate) mod item;
pub(crate) mod item_variant;
pub(crate) mod location;
pub(crate) mod location_movement;
pub(crate) mod master_list;
pub(crate) mod master_list_line;
pub(crate) mod master_list_name_join;
pub(crate) mod name;
pub(crate) mod name_oms_fields;
pub(crate) mod name_property;
pub(crate) mod name_store_join;
pub(crate) mod name_tag;
pub(crate) mod name_tag_join;
pub(crate) mod packaging_variant;
pub(crate) mod period;
pub(crate) mod period_schedule;
pub(crate) mod program_indicator;
pub(crate) mod program_requisition_settings;
pub(crate) mod property;
pub(crate) mod reason;
pub(crate) mod report;
pub(crate) mod requisition;
pub(crate) mod requisition_line;
pub(crate) mod rnr_form;
pub(crate) mod rnr_form_line;
pub(crate) mod sensor;
pub(crate) mod special;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
pub(crate) mod stocktake_line;
pub(crate) mod store;
pub(crate) mod store_preference;
pub(crate) mod sync_file_reference;
pub(crate) mod temperature_breach;
pub(crate) mod temperature_log;
pub(crate) mod unit;
pub(crate) mod user;
pub(crate) mod user_permission;
pub(crate) mod vaccination;
pub(crate) mod vaccine_course;
pub(crate) mod vaccine_course_dose;
pub(crate) mod vaccine_course_item;

pub(crate) fn get_all_pull_upsert_central_test_records() -> Vec<TestSyncIncomingRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut user::test_pull_upsert_records());
    test_records.append(&mut user_permission::test_pull_upsert_records());
    test_records.append(&mut item::test_pull_upsert_records());
    test_records.append(&mut master_list_line::test_pull_upsert_records());
    test_records.append(&mut master_list_name_join::test_pull_upsert_records());
    test_records.append(&mut master_list::test_pull_upsert_records());
    test_records.append(&mut period_schedule::test_pull_upsert_records());
    test_records.append(&mut period::test_pull_upsert_records());
    test_records.append(&mut name::test_pull_upsert_records());
    test_records.append(&mut name_tag::test_pull_upsert_records());
    test_records.append(&mut report::test_pull_upsert_records());
    test_records.append(&mut store::test_pull_upsert_records());
    test_records.append(&mut unit::test_pull_upsert_records());
    test_records.append(&mut reason::test_pull_upsert_records());
    test_records.append(&mut store_preference::test_pull_upsert_records());
    test_records.append(&mut cold_storage_type::test_pull_upsert_records());
    // Central but site specific
    test_records.append(&mut name_store_join::test_pull_upsert_records());
    test_records.append(&mut special::name_to_name_store_join::test_pull_upsert_records());
    test_records.append(&mut barcode::test_pull_upsert_records());
    // Open mSupply Central
    test_records.append(&mut name_oms_fields::test_pull_upsert_records());
    test_records.append(&mut asset_class::test_pull_upsert_records());
    test_records.append(&mut asset_category::test_pull_upsert_records());
    test_records.append(&mut asset_type::test_pull_upsert_records());
    test_records.append(&mut asset_catalogue_item::test_pull_upsert_records());
    test_records.append(&mut asset::test_pull_upsert_records());
    test_records.append(&mut asset_log::test_pull_upsert_records());
    test_records.append(&mut asset_log_reason::test_pull_upsert_records());
    test_records.append(&mut sync_file_reference::test_pull_upsert_records());
    test_records.append(&mut asset_property::test_pull_upsert_records());
    test_records.append(&mut property::test_pull_upsert_records());
    test_records.append(&mut name_property::test_pull_upsert_records());
    test_records.append(&mut demographic::test_pull_upsert_records());
    test_records.append(&mut vaccine_course::test_pull_upsert_records());
    test_records.append(&mut vaccine_course_dose::test_pull_upsert_records());
    test_records.append(&mut vaccine_course_item::test_pull_upsert_records());
    test_records.append(&mut program_indicator::test_pull_upsert_records());
    test_records.append(&mut indicator_attribute::test_pull_upsert_records());
    test_records.append(&mut item_variant::test_pull_upsert_records());
    test_records.append(&mut packaging_variant::test_pull_upsert_records());

    test_records
}

pub(crate) fn get_all_pull_upsert_remote_test_records() -> Vec<TestSyncIncomingRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut location::test_pull_upsert_records());
    test_records.append(&mut sensor::test_pull_upsert_records());
    test_records.append(&mut temperature_log::test_pull_upsert_records());
    test_records.append(&mut temperature_breach::test_pull_upsert_records());
    test_records.append(&mut location_movement::test_pull_upsert_records());
    test_records.append(&mut requisition_line::test_pull_upsert_records());
    test_records.append(&mut requisition::test_pull_upsert_records());
    test_records.append(&mut stock_line::test_pull_upsert_records());
    test_records.append(&mut stocktake_line::test_pull_upsert_records());
    test_records.append(&mut stocktake::test_pull_upsert_records());
    test_records.append(&mut invoice_line::test_pull_upsert_records());
    test_records.append(&mut invoice::test_pull_upsert_records());
    test_records.append(&mut activity_log::test_pull_upsert_records());
    test_records.append(&mut name_tag_join::test_pull_upsert_records());
    test_records.append(&mut program_requisition_settings::test_pull_upsert_records());
    test_records.append(&mut name_store_join::test_pull_upsert_records());
    test_records.append(&mut special::name_to_name_store_join::test_pull_upsert_records());
    test_records.append(&mut currency::test_pull_upsert_records());
    test_records.append(&mut indicator_value::test_pull_upsert_records());

    // Open mSupply central
    test_records.append(&mut rnr_form::test_pull_upsert_records());
    test_records.append(&mut rnr_form_line::test_pull_upsert_records());
    test_records.append(&mut vaccination::test_pull_upsert_records());

    test_records
}

pub(crate) fn get_all_pull_delete_central_test_records() -> Vec<TestSyncIncomingRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut user_permission::test_pull_delete_records());
    test_records.append(&mut unit::test_pull_delete_records());
    test_records.append(&mut item::test_pull_delete_records());
    test_records.append(&mut currency::test_pull_delete_records());
    test_records.append(&mut master_list_name_join::test_pull_delete_records());
    test_records.append(&mut report::test_pull_delete_records());
    test_records.append(&mut store::test_pull_delete_records());
    test_records.append(&mut unit::test_pull_delete_records());

    // Central but site specific
    test_records.append(&mut name_store_join::test_pull_delete_records());

    test_records
}

pub(crate) fn get_all_pull_delete_remote_test_records() -> Vec<TestSyncIncomingRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut requisition::test_pull_delete_records());
    test_records.append(&mut requisition_line::test_pull_delete_records());
    test_records.append(&mut invoice::test_pull_delete_records());
    test_records.append(&mut invoice_line::test_pull_delete_records());
    test_records.append(&mut name_tag_join::test_pull_delete_records());
    test_records.append(&mut indicator_value::test_pull_delete_records());

    test_records
}

pub(crate) fn get_all_push_test_records() -> Vec<TestSyncOutgoingRecord> {
    let mut test_records = Vec::new();
    test_records.append(&mut name::test_push_records());
    test_records.append(&mut location::test_push_records());
    test_records.append(&mut sensor::test_push_records());
    test_records.append(&mut temperature_log::test_push_records());
    test_records.append(&mut temperature_breach::test_push_records());
    test_records.append(&mut location_movement::test_push_records());
    test_records.append(&mut requisition_line::test_push_records());
    test_records.append(&mut requisition::test_push_records());
    test_records.append(&mut stock_line::test_push_records());
    test_records.append(&mut stocktake_line::test_push_records());
    test_records.append(&mut stocktake::test_push_records());
    test_records.append(&mut indicator_value::test_push_records());
    test_records.append(&mut invoice_line::test_push_records());
    test_records.append(&mut invoice::test_push_records());
    test_records.append(&mut activity_log::test_push_records());
    test_records.append(&mut barcode::test_push_records());
    test_records.append(&mut name_store_join::test_push_upsert());
    test_records.append(&mut name_to_name_store_join::test_push_records());

    test_records
}

pub(crate) fn get_all_sync_v6_records() -> Vec<TestSyncOutgoingRecord> {
    let mut test_records = Vec::new();

    // Central
    test_records.append(&mut asset_class::test_v6_central_push_records());
    test_records.append(&mut asset_category::test_v6_central_push_records());
    test_records.append(&mut asset_type::test_v6_central_push_records());
    test_records.append(&mut asset_catalogue_item::test_v6_central_push_records());
    test_records.append(&mut vaccine_course::test_v6_records());
    test_records.append(&mut vaccine_course_item::test_v6_records());
    test_records.append(&mut name_oms_fields::test_v6_central_push_records());
    test_records.append(&mut item_variant::test_v6_central_push_records());
    test_records.append(&mut packaging_variant::test_v6_central_push_records());
    test_records.append(&mut property::test_v6_central_push_records());

    // Remote
    test_records.append(&mut asset::test_v6_records());
    test_records.append(&mut asset_log::test_v6_records());
    test_records.append(&mut asset_log_reason::test_v6_records());
    test_records.append(&mut sync_file_reference::test_v6_records());
    test_records.append(&mut asset_property::test_v6_central_push_records());
    test_records.append(&mut name_property::test_v6_central_push_records());
    test_records.append(&mut rnr_form::test_v6_records());
    test_records.append(&mut rnr_form_line::test_v6_records());
    test_records.append(&mut demographic::test_v6_records());
    test_records.append(&mut vaccine_course_dose::test_v6_records());
    test_records.append(&mut vaccination::test_v6_records());

    test_records
}
