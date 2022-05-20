use super::common::FullMockMasterList;
use crate::{MasterListLineRow, MasterListNameJoinRow, MasterListRow};

pub fn mock_full_master_lists() -> Vec<FullMockMasterList> {
    vec![
        mock_master_list_item_query_test1(),
        mock_master_list_master_list_filter_test(),
        mock_master_list_master_list_line_filter_test(),
    ]
}

pub fn mock_master_list_item_query_test1() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "item_query_test1".to_owned(),
            name: "name_item_query_test1".to_owned(),
            code: "code_item_query_test1".to_owned(),
            description: "description_item_query_test1".to_owned(),
        },
        joins: vec![MasterListNameJoinRow {
            id: "item_query_test1".to_owned(),
            master_list_id: "item_query_test1".to_owned(),
            name_id: "name_store_a".to_owned(),
        }],
        lines: vec![MasterListLineRow {
            id: "item_query_test1".to_owned(),
            item_id: "item_query_test1".to_owned(),
            master_list_id: "item_query_test1".to_owned(),
        }],
    }
}

pub fn mock_master_list_master_list_filter_test() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_filter_test".to_owned(),
            name: "name_master_list_filter_test".to_owned(),
            code: "code_master_list_filter_test".to_owned(),
            description: "description_master_list_filter_test".to_owned(),
        },
        joins: vec![MasterListNameJoinRow {
            id: "master_list_filter_test".to_owned(),
            master_list_id: "master_list_filter_test".to_owned(),
            name_id: "id_master_list_filter_test".to_owned(),
        }],
        lines: Vec::new(),
    }
}

pub fn mock_master_list_master_list_line_filter_test() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_master_list_line_filter_test".to_owned(),
            name: "name_master_list_master_list_line_filter_test".to_owned(),
            code: "code_master_list_master_list_line_filter_test".to_owned(),
            description: "description_master_list_master_list_line_filter_test".to_owned(),
        },
        joins: Vec::new(),
        lines: vec![
            MasterListLineRow {
                id: "master_list_line_filter_test_1".to_owned(),
                item_id: "item_a".to_owned(),
                master_list_id: "master_list_master_list_line_filter_test".to_owned(),
            },
            MasterListLineRow {
                id: "master_list_line_filter_test_2".to_owned(),
                item_id: "item_b".to_owned(),
                master_list_id: "master_list_master_list_line_filter_test".to_owned(),
            },
        ],
    }
}
