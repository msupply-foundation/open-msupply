use crate::vvm_status::vvm_status_row::VVMStatusRow;

pub fn mock_vvm_status_a() -> VVMStatusRow {
    VVMStatusRow {
        id: "vvm_status_id_a".to_string(),
        description: "VVM Stage 1 - Good".to_string(),
        code: "VVM1".to_string(),
        level: 1,
        is_active: true,
        unusable: false,
        reason_id: None,
    }
}

pub fn mock_vvm_status_b() -> VVMStatusRow {
    VVMStatusRow {
        id: "vvm_status_id_b".to_string(),
        description: "VVM Stage 2 - Okay".to_string(),
        code: "VVM2".to_string(),
        level: 2,
        is_active: true,
        unusable: false,
        reason_id: None,
    }
}

pub fn mock_vvm_status_c_level3_unusable() -> VVMStatusRow {
    VVMStatusRow {
        id: "vvm_status_id_c".to_string(),
        description: "VVM Stage 3 - Unusable".to_string(),
        code: "VVM3".to_string(),
        level: 3,
        is_active: false,
        unusable: true,
        reason_id: None,
    }
}

pub fn mock_vvm_statuses() -> Vec<VVMStatusRow> {
    vec![
        mock_vvm_status_a(),
        mock_vvm_status_b(),
        mock_vvm_status_c_level3_unusable(),
    ]
}
