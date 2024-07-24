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
    ]
}

pub fn mock_master_list_item_query_test1() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "item_query_test1".to_owned(),
            name: "name_item_query_test1".to_owned(),
            code: "code_item_query_test1".to_owned(),
            description: "description_item_query_test1".to_owned(),
            is_active: true,
        },
        joins: vec![MasterListNameJoinRow {
            id: "item_query_test1".to_owned(),
            master_list_id: "item_query_test1".to_owned(),
            name_link_id: "name_store_a".to_owned(),
        }],
        lines: vec![MasterListLineRow {
            id: "item_query_test1".to_owned(),
            item_link_id: "item_query_test1".to_owned(),
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
            is_active: true,
        },
        joins: vec![MasterListNameJoinRow {
            id: "master_list_filter_test".to_owned(),
            master_list_id: "master_list_filter_test".to_owned(),
            name_link_id: "id_master_list_filter_test".to_owned(),
        }],
        lines: Vec::new(),
    }
}

pub fn mock_master_list_program() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_program".to_owned(),
            name: "master_list_program_name".to_owned(),
            code: "master_list_program_code".to_owned(),
            description: "master_list_program_description".to_owned(),
            is_active: true,
        },
        joins: vec![
            MasterListNameJoinRow {
                id: "master_list_program".to_owned(),
                master_list_id: "master_list_program".to_owned(),
                name_link_id: mock_program_master_list_test().id,
            },
            MasterListNameJoinRow {
                id: "master_list_program_store_b".to_owned(),
                master_list_id: "master_list_program".to_owned(),
                name_link_id: mock_name_store_b().id,
            },
        ],
        lines: vec![MasterListLineRow {
            id: "program_item".to_owned(),
            item_link_id: "item_query_test1".to_owned(),
            master_list_id: "master_list_program".to_owned(),
        }],
    }
}

pub fn mock_master_list_program_b() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_program_b".to_owned(),
            name: "master_list_program_b_name".to_owned(),
            code: "master_list_program_b_code".to_owned(),
            description: "master_list_program_b_description".to_owned(),
            is_active: true,
        },
        joins: vec![MasterListNameJoinRow {
            id: "master_list_program_store_a".to_owned(),
            master_list_id: "master_list_program_b".to_owned(),
            name_link_id: mock_name_store_a().id,
        }],
        lines: vec![MasterListLineRow {
            id: "program_b_item".to_owned(),
            item_link_id: "item_query_test1".to_owned(),
            master_list_id: "master_list_program_b".to_owned(),
        }],
    }
}

pub fn mock_master_list_master_list_line_filter_test() -> FullMockMasterList {
    FullMockMasterList {
        master_list: MasterListRow {
            id: "master_list_master_list_line_filter_test".to_owned(),
            name: "name_master_list_master_list_line_filter_test".to_owned(),
            code: "code_master_list_master_list_line_filter_test".to_owned(),
            description: "description_master_list_master_list_line_filter_test".to_owned(),
            is_active: true,
        },
        joins: Vec::new(),
        lines: vec![
            MasterListLineRow {
                id: "master_list_line_filter_test_1".to_owned(),
                item_link_id: "item_a".to_owned(),
                master_list_id: "master_list_master_list_line_filter_test".to_owned(),
            },
            MasterListLineRow {
                id: "master_list_line_filter_test_2".to_owned(),
                item_link_id: "item_b".to_owned(),
                master_list_id: "master_list_master_list_line_filter_test".to_owned(),
            },
        ],
    }
}
