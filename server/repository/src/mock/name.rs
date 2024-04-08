use util::{
    constants::{INVENTORY_ADJUSTMENT_NAME_CODE, REPACK_NAME_CODE},
    inline_init,
};

use crate::{NameLinkRow, NameRow, NameType};

pub fn mock_name_store_a() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_a");
        r.name = String::from("Store A");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_store_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_b");
        r.name = String::from("Store B");
        r.code = String::from("code");
    })
}

pub fn mock_name_store_c() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_c");
        r.name = String::from("Store C");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_store_e() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_e");
        r.name = String::from("Store E");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_a() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_a");
        r.name = String::from("name_a");
        r.code = String::from("name_a");
        r.is_supplier = true;
    })
}

// Not visible in store_a
pub fn mock_name_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_b");
        r.name = String::from("name_b");
        r.code = String::from("name_b");
        r.is_supplier = true;
    })
}

pub fn mock_name_c() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_c");
        r.name = String::from("name_c");
        r.code = String::from("name_c");
        r.is_supplier = true;
    })
}
pub fn mock_name_customer_a() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_customer_a");
        r.name = String::from("name_customer_a");
        r.code = String::from("name_customer_a");
        r.is_customer = true;
    })
}

// Inventory adjustment name
pub fn mock_name_invad() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = INVENTORY_ADJUSTMENT_NAME_CODE.to_string();
        r.name = String::from("Inventory adjustments");
        r.code = INVENTORY_ADJUSTMENT_NAME_CODE.to_string();
    })
}

pub fn mock_name_master_list_filter_test() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("id_master_list_filter_test");
        r.name = String::from("name_master_list_filter_test");
        r.code = String::from("master_list_filter_test");
        r.is_supplier = true;
        r.is_customer = true;
    })
}

pub fn mock_program_master_list_test() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("program_master_list_test");
        r.name = String::from("program_master_list_test");
        r.code = String::from("program_master_list_test");
        r.is_supplier = true;
        r.is_customer = true;
    })
}

pub fn mock_name_repack() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = REPACK_NAME_CODE.to_string();
        r.name = REPACK_NAME_CODE.to_string();
        r.code = REPACK_NAME_CODE.to_string();
        r.r#type = NameType::Repack;
    })
}

pub fn mock_patient() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("testId");
        r.name = String::from("testId");
        r.code = String::from("testId");
        r.is_customer = true;
        r.r#type = NameType::Patient;
    })
}

pub fn mock_patient_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("patient2");
        r.name = String::from("patient2");
        r.code = String::from("patient2");
        r.is_customer = true;
        r.r#type = NameType::Patient;
    })
}

// Deleted through a merge
fn mock_merged_patient() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("softdeleted");
        r.name = String::from("softdeleted");
        r.code = String::from("softdeleted");
        r.is_customer = true;
        r.r#type = NameType::Patient;
    })
}

pub fn mock_merged_patient_name_link() -> NameLinkRow {
    NameLinkRow {
        id: mock_merged_patient().id,
        name_id: mock_patient().id,
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
    ]
}

pub fn mock_name_links() -> Vec<NameLinkRow> {
    vec![mock_merged_patient_name_link()]
}
