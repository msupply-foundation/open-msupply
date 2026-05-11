use util::constants::{INVENTORY_ADJUSTMENT_NAME_CODE, REPACK_NAME_CODE};

use crate::{NameLinkRow, NameRow, NameRowType};

pub fn mock_name_store_a() -> NameRow {
    NameRow {
        id: String::from("name_store_a"),
        name: String::from("Store A"),
        code: String::from("code"),
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_store_b() -> NameRow {
    NameRow {
        id: String::from("name_store_b"),
        name: String::from("Store B"),
        code: String::from("code"),
        is_manufacturer: true,
        margin: Some(10.0),
        ..Default::default()
    }
}

pub fn mock_name_store_c() -> NameRow {
    NameRow {
        id: String::from("name_store_c"),
        name: String::from("Store C"),
        code: String::from("code"),
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_store_e() -> NameRow {
    NameRow {
        id: String::from("name_store_e"),
        name: String::from("Store E"),
        code: String::from("code"),
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_a() -> NameRow {
    NameRow {
        id: String::from("name_a"),
        name: String::from("name_a"),
        code: String::from("name_a"),
        is_supplier: true,
        ..Default::default()
    }
}

// Not visible in store_a
pub fn mock_name_b() -> NameRow {
    NameRow {
        id: String::from("name_b"),
        name: String::from("name_b"),
        code: String::from("name_b"),
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_c() -> NameRow {
    NameRow {
        id: String::from("name_c"),
        name: String::from("name_c"),
        code: String::from("name_c"),
        is_supplier: true,
        ..Default::default()
    }
}
pub fn mock_name_customer_a() -> NameRow {
    NameRow {
        id: String::from("name_customer_a"),
        name: String::from("name_customer_a"),
        code: String::from("name_customer_a"),
        is_customer: true,
        ..Default::default()
    }
}

// Inventory adjustment name
pub fn mock_name_invad() -> NameRow {
    NameRow {
        id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
        name: String::from("Inventory adjustments"),
        code: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
        ..Default::default()
    }
}

pub fn mock_name_master_list_filter_test() -> NameRow {
    NameRow {
        id: String::from("id_master_list_filter_test"),
        name: String::from("name_master_list_filter_test"),
        code: String::from("master_list_filter_test"),
        is_supplier: true,
        is_customer: true,
        ..Default::default()
    }
}

pub fn mock_program_master_list_test() -> NameRow {
    NameRow {
        id: String::from("program_master_list_test"),
        name: String::from("program_master_list_test"),
        code: String::from("program_master_list_test"),
        is_supplier: true,
        is_customer: true,
        ..Default::default()
    }
}

pub fn mock_name_repack() -> NameRow {
    NameRow {
        id: REPACK_NAME_CODE.to_string(),
        name: REPACK_NAME_CODE.to_string(),
        code: REPACK_NAME_CODE.to_string(),
        r#type: NameRowType::Repack,
        ..Default::default()
    }
}

pub fn mock_donor_a() -> NameRow {
    NameRow {
        id: String::from("donor_a"),
        name: String::from("donor_a"),
        code: String::from("donor_a"),
        is_donor: true,
        ..Default::default()
    }
}

pub fn mock_donor_b() -> NameRow {
    NameRow {
        id: String::from("donor_b"),
        name: String::from("donor_b"),
        code: String::from("donor_b"),
        is_donor: true,
        ..Default::default()
    }
}

pub fn mock_patient() -> NameRow {
    NameRow {
        id: String::from("testId"),
        name: String::from("testId"),
        code: String::from("testId"),
        is_customer: true,
        r#type: NameRowType::Patient,
        ..Default::default()
    }
}

pub fn mock_patient_b() -> NameRow {
    NameRow {
        id: String::from("patient2"),
        name: String::from("patient2"),
        code: String::from("patient2"),
        is_customer: true,
        r#type: NameRowType::Patient,
        ..Default::default()
    }
}

// Deleted through a merge
fn mock_merged_patient() -> NameRow {
    NameRow {
        id: String::from("softdeleted"),
        name: String::from("softdeleted"),
        code: String::from("softdeleted"),
        is_customer: true,
        r#type: NameRowType::Patient,
        ..Default::default()
    }
}

pub fn mock_merged_patient_name_link() -> NameLinkRow {
    NameLinkRow {
        id: mock_merged_patient().id,
        name_id: mock_patient().id,
    }
}

pub fn mock_store_b_name_link() -> NameLinkRow {
    NameLinkRow {
        id: mock_name_store_b().id,
        name_id: mock_name_store_b().id,
    }
}

pub fn mock_names() -> Vec<NameRow> {
    vec![
        mock_name_a(),
        mock_name_b(),
        mock_name_c(),
        mock_name_customer_a(),
        mock_name_invad(),
        mock_name_master_list_filter_test(),
        mock_name_store_a(),
        mock_name_store_b(),
        mock_name_store_c(),
        mock_name_repack(),
        mock_patient(),
        mock_patient_b(),
        mock_program_master_list_test(),
        mock_merged_patient(),
        mock_donor_a(),
        mock_donor_b(),
    ]
}

pub fn mock_name_links() -> Vec<NameLinkRow> {
    vec![mock_merged_patient_name_link(), mock_store_b_name_link()]
}
