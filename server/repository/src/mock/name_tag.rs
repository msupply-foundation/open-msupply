use crate::{NameTagJoinRow, NameTagRow};

use super::{mock_name_store_b, mock_program_master_list_test, mock_program_master_list_test_b};

pub fn mock_name_tag_1() -> NameTagRow {
    NameTagRow {
        id: "name_tag_1".to_string(),
        name: "NewProgramTag1".to_string(),
    }
}

pub fn mock_name_tag_2() -> NameTagRow {
    NameTagRow {
        id: "name_tag_2".to_string(),
        name: "NewProgramTag2".to_string(),
    }
}

pub fn mock_name_tag_3() -> NameTagRow {
    NameTagRow {
        id: "name_tag_3".to_string(),
        name: "NewProgramTag3".to_string(),
    }
}

pub fn mock_name_tag_join_1() -> NameTagJoinRow {
    NameTagJoinRow {
        id: "master_list_name_tag".to_string(),
        name_link_id: mock_program_master_list_test().id,
        name_tag_id: mock_name_tag_1().id,
    }
}

pub fn mock_name_tag_join_2() -> NameTagJoinRow {
    NameTagJoinRow {
        id: "master_list_name_tag".to_string(),
        name_link_id: mock_program_master_list_test_b().id,
        name_tag_id: mock_name_tag_1().id,
    }
}

pub fn mock_name_tag_join_3() -> NameTagJoinRow {
    NameTagJoinRow {
        id: "master_list_name_tag".to_string(),
        name_link_id: mock_name_store_b().id,
        name_tag_id: mock_name_tag_1().id,
    }
}

pub fn mock_name_tags() -> Vec<NameTagRow> {
    vec![mock_name_tag_1(), mock_name_tag_2(), mock_name_tag_3()]
}

pub fn mock_name_tag_joins() -> Vec<NameTagJoinRow> {
    vec![
        mock_name_tag_join_1(),
        mock_name_tag_join_2(),
        mock_name_tag_join_3(),
    ]
}
