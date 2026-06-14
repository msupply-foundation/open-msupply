use repository::{InvoiceType, RepositoryError, StorageConnection};

use crate::property_v2::check_unknown_property_v2_key;
pub(crate) use crate::property_v2::apply_properties_v2_patch;

/// `property_table_v2.table_name` scope an invoice type's properties are
/// configured under — the UI record kind the type renders as. `None` for types
/// with no properties surface (repack, inventory adjustments). The canonical
/// type→scope map, shared by the per-type update services' patch validation and
/// the GraphQL read/filter paths.
pub fn invoice_property_table_name(invoice_type: &InvoiceType) -> Option<&'static str> {
    match invoice_type {
        InvoiceType::InboundShipment => Some("inbound_shipment"),
        InvoiceType::OutboundShipment => Some("outbound_shipment"),
        InvoiceType::Prescription => Some("prescription"),
        InvoiceType::SupplierReturn => Some("supplier_return"),
        InvoiceType::CustomerReturn => Some("customer_return"),
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction | InvoiceType::Repack => {
            None
        }
    }
}

/// Validate a `properties_v2` patch against the invoice type's visible scope:
/// resolves the type's `table_name` and delegates to the generic
/// [`check_unknown_property_v2_key`]. A type with no scope allows no keys.
pub fn check_unknown_properties_v2_key(
    connection: &StorageConnection,
    invoice_type: &InvoiceType,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Option<String>, RepositoryError> {
    let Some(table_name) = invoice_property_table_name(invoice_type) else {
        return Ok(patch.keys().next().cloned());
    };
    check_unknown_property_v2_key(connection, table_name, patch)
}

#[cfg(test)]
mod test {
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;
    use repository::{
        InvoiceType, PropertyDisplayModeV2, PropertyTableV2Row, PropertyTableV2RowRepository,
        PropertyV2Row, PropertyV2RowRepository, PropertyValueTypeV2,
    };
    use serde_json::json;

    use super::*;

    fn patch(pairs: &[(&str, serde_json::Value)]) -> serde_json::Map<String, serde_json::Value> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect()
    }

    #[actix_rt::test]
    async fn check_unknown_properties_v2_key_validates_scope() {
        let (_, connection, _, _) = setup_all(
            "check_unknown_properties_v2_key_validates_scope",
            MockDataInserts::none(),
        )
        .await;

        PropertyV2RowRepository::new(&connection)
            .upsert_one(&PropertyV2Row {
                id: "legacy_transaction_category_si".to_string(),
                key: "inbound_shipment_category".to_string(),
                name: "Category".to_string(),
                value_type: PropertyValueTypeV2::Option,
                is_legacy: true,
                deleted_datetime: None,
            })
            .unwrap();
        PropertyTableV2RowRepository::new(&connection)
            .upsert_one(&PropertyTableV2Row {
                id: "legacy_transaction_category_si__inbound_shipment".to_string(),
                property_id: "legacy_transaction_category_si".to_string(),
                table_name: "inbound_shipment".to_string(),
                display_mode: PropertyDisplayModeV2::Visible,
            })
            .unwrap();

        // Known key for the type's scope passes.
        assert_eq!(
            check_unknown_properties_v2_key(
                &connection,
                &InvoiceType::InboundShipment,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            None
        );
        // Unknown key is reported.
        assert_eq!(
            check_unknown_properties_v2_key(
                &connection,
                &InvoiceType::InboundShipment,
                &patch(&[("not_a_property", json!("x"))]),
            )
            .unwrap(),
            Some("not_a_property".to_string())
        );
        // Another scope's key is unknown for this type.
        assert_eq!(
            check_unknown_properties_v2_key(
                &connection,
                &InvoiceType::OutboundShipment,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            Some("inbound_shipment_category".to_string())
        );
        // Types without a properties scope allow no keys.
        assert_eq!(
            check_unknown_properties_v2_key(
                &connection,
                &InvoiceType::Repack,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            Some("inbound_shipment_category".to_string())
        );
    }

    #[test]
    fn apply_properties_v2_patch_merges_and_deletes() {
        // None patch leaves the blob untouched.
        assert_eq!(
            apply_properties_v2_patch(Some(json!({ "a": "1" })), None),
            Some(json!({ "a": "1" }))
        );
        // Patch merges over existing, preserving untouched keys.
        assert_eq!(
            apply_properties_v2_patch(
                Some(json!({ "a": "1", "keep": "2" })),
                Some(patch(&[("a", json!("new"))])),
            ),
            Some(json!({ "a": "new", "keep": "2" }))
        );
        // Null deletes the key; an emptied blob becomes None.
        assert_eq!(
            apply_properties_v2_patch(
                Some(json!({ "a": "1" })),
                Some(patch(&[("a", json!(null))])),
            ),
            None
        );
        // Patch onto an empty blob creates it.
        assert_eq!(
            apply_properties_v2_patch(None, Some(patch(&[("a", json!("1"))]))),
            Some(json!({ "a": "1" }))
        );
    }
}
