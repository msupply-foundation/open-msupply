// TODO move this into mocks
pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_a".to_string();
        r.store_id = mock_store_a().id;
        r.status = Some("mock_status".to_string());
    })
}

pub fn mock_purchase_order_b() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_b".to_string();
        r.store_id = mock_store_a().id;
        r.status = Some("mock_status".to_string());
    })
}
