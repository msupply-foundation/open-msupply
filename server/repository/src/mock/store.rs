use util::inline_init;

use crate::StoreRow;

pub fn mock_store_a() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "store_a".to_string();
        s.name_id = "name_store_a".to_string();
        s.code = "code".to_string();
    })
}

pub fn mock_store_b() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "store_b".to_string();
        s.name_id = "name_store_b".to_string();
        s.code = "code".to_string();
        s.site_id = 2;
    })
}

pub fn mock_store_c() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "store_c".to_string();
        s.name_id = "name_store_c".to_string();
        s.code = "code".to_string();
    })
}

pub fn mock_stores() -> Vec<StoreRow> {
    vec![mock_store_a(), mock_store_b(), mock_store_c()]
}
