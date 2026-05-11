use super::{
    common::FullMockMasterList, mock_name_store_a, mock_name_store_b, mock_program_master_list_test,
};
use crate::{MasterListLineRow, MasterListNameJoinRow, MasterListRow};

pub fn mock_full_master_lists() -> Vec<FullMockMasterList> {
    vec![
        mock_master_list_item_query_test1(),
        mock_master_list_master_list_filter_test(),
        mock_master_list_master_list_line_filter_test(),
        mock_master_list_program(),
        mock_master_list_program_b(),
        mock_master_list_default_price_list(),
    ]
}

pub fn mock_master_list_item_query_test1() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "item_query_test1".to_string(),
            name: "name_item_query_test1".to_string(),
            code: "code_item_query_test1".to_string(),
            description: "description_item_query_test1".to_string(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![MasterListNameJoinRow {
            id: "item_query_test1".to_string(),
            master_list_id: "item_query_test1".to_string(),
            name_id: "name_store_a".to_string(),
        }],
        lines: vec![MasterListLineRow {
            id: "item_query_test1".to_string(),
            item_link_id: "item_query_test1".to_string(),
            master_list_id: "item_query_test1".to_string(),
            ..Default::default()
        }],
    }
}

pub fn mock_master_list_master_list_filter_test() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_filter_test".to_string(),
            name: "name_master_list_filter_test".to_string(),
            code: "code_master_list_filter_test".to_string(),
            description: "description_master_list_filter_test".to_string(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![MasterListNameJoinRow {
            id: "master_list_filter_test".to_string(),
            master_list_id: "master_list_filter_test".to_string(),
            name_id: "id_master_list_filter_test".to_string(),
        }],
        lines: Vec::new(),
    }
}

pub fn mock_master_list_program() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_program".to_string(),
            name: "master_list_program_name".to_string(),
            code: "master_list_program_code".to_string(),
            description: "master_list_program_description".to_string(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![
            MasterListNameJoinRow {
                id: "master_list_program".to_string(),
                master_list_id: "master_list_program".to_string(),
                name_id: mock_program_master_list_test().id,
            },
            MasterListNameJoinRow {
                id: "master_list_program_store_b".to_string(),
                master_list_id: "master_list_program".to_string(),
                name_id: mock_name_store_b().id,
            },
        ],
        lines: vec![MasterListLineRow {
            id: "program_item".to_string(),
            item_link_id: "item_query_test1".to_string(),
            master_list_id: "master_list_program".to_string(),
            ..Default::default()
        }],
    }
}

pub fn mock_master_list_program_b() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_program_b".to_string(),
            name: "master_list_program_b_name".to_string(),
            code: "master_list_program_b_code".to_string(),
            description: "master_list_program_b_description".to_string(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![
            MasterListNameJoinRow {
                id: "master_list_program_b_store_a".to_string(),
                master_list_id: "master_list_program_b".to_string(),
                name_id: mock_name_store_a().id,
            },
            MasterListNameJoinRow {
                id: "master_list_program_b_store_b".to_string(),
                master_list_id: "master_list_program_b".to_string(),
                name_id: mock_name_store_b().id,
            },
        ],
        lines: vec![MasterListLineRow {
            id: "program_b_item".to_string(),
            item_link_id: "item_query_test1".to_string(),
            master_list_id: "master_list_program_b".to_string(),
            ..Default::default()
        }],
    }
}

pub fn mock_master_list_master_list_line_filter_test() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_master_list_line_filter_test".to_string(),
            name: "name_master_list_master_list_line_filter_test".to_string(),
            code: "code_master_list_master_list_line_filter_test".to_string(),
            description: "description_master_list_master_list_line_filter_test".to_string(),
            is_active: true,
            ..Default::default()
        },
        joins: Vec::new(),
        lines: vec![
            MasterListLineRow {
                id: "master_list_line_filter_test_1".to_string(),
                item_link_id: "item_a".to_string(),
                master_list_id: "master_list_master_list_line_filter_test".to_string(),
                ..Default::default()
            },
            MasterListLineRow {
                id: "master_list_line_filter_test_2".to_string(),
                item_link_id: "item_b".to_string(),
                master_list_id: "master_list_master_list_line_filter_test".to_string(),
                ..Default::default()
            },
        ],
    }
}

pub fn mock_master_list_default_price_list() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_default_price_list".to_string(),
            name: "name_master_list_default_price_list".to_string(),
            code: "code_master_list_default_price_list".to_string(),
            description: "description_master_list_default_price_list".to_string(),
            is_active: true,
            is_default_price_list: true,
            ..Default::default()
        },
        joins: Vec::new(),
        lines: vec![
            MasterListLineRow {
                id: "master_list_line_default_price_1".to_string(),
                item_link_id: "item_a".to_string(),
                master_list_id: "master_list_default_price_list".to_string(),
                price_per_unit: Some(1.0),
                ..Default::default()
            },
            MasterListLineRow {
                id: "master_list_line_default_price_2".to_string(),
                item_link_id: "item_b".to_string(),
                master_list_id: "master_list_default_price_list".to_string(),
                price_per_unit: Some(2.001),
                ..Default::default()
            },
        ],
    }
}
