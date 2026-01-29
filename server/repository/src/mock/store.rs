use chrono::NaiveDate;

use crate::StoreRow;

use super::mock_program_master_list_test;

pub fn mock_store_a() -> StoreRow {
    StoreRow {
        id: "store_a".to_string(),
        name_id: "name_store_a".to_string(),
        code: "code".to_string(),
        site_id: 100,
        created_date: NaiveDate::from_ymd_opt(2020, 1, 1),
        ..Default::default()
    }
}

pub fn mock_store_b() -> StoreRow {
    StoreRow {
        id: "store_b".to_string(),
        name_id: "name_store_b".to_string(),
        code: "code".to_string(),
        site_id: 2,
        created_date: NaiveDate::from_ymd_opt(2020, 1, 1),
        ..Default::default()
    }
}

pub fn mock_store_c() -> StoreRow {
    StoreRow {
        id: "store_c".to_string(),
        name_id: "name_store_c".to_string(),
        code: "code".to_string(),
        created_date: NaiveDate::from_ymd_opt(2020, 1, 1),
        ..Default::default()
    }
}

pub fn program_master_list_store() -> StoreRow {
    StoreRow {
        id: "program_master_list_store".to_string(),
        name_id: mock_program_master_list_test().id,
        code: mock_program_master_list_test().code,
        created_date: NaiveDate::from_ymd_opt(2020, 1, 1),
        ..Default::default()
    }
}

pub fn mock_stores() -> Vec<StoreRow> {
    vec![
        mock_store_a(),
        mock_store_b(),
        mock_store_c(),
        program_master_list_store(),
    ]
}
