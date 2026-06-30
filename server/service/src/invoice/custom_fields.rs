use repository::{InvoiceType, RepositoryError, StorageConnection};

use crate::custom_field::check_unknown_custom_field_key;
pub(crate) use crate::custom_field::apply_custom_fields_patch;

/// `custom_field_scope.scope` scope an invoice type's custom_fields are
/// configured under — the UI record kind the type renders as. `None` for types
/// with no custom_fields surface (repack, inventory adjustments). The canonical
/// type→scope map, shared by the per-type update services' patch validation and
/// the GraphQL read/filter paths.
pub fn invoice_custom_field_scope(invoice_type: &InvoiceType) -> Option<&'static str> {
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

/// Validate a `custom_fields` patch against the invoice type's visible scope:
/// resolves the type's `scope` and delegates to the generic
/// [`check_unknown_custom_field_key`]. A type with no scope allows no keys.
pub fn check_unknown_custom_fields_key(
    connection: &StorageConnection,
    invoice_type: &InvoiceType,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Option<String>, RepositoryError> {
    let Some(scope) = invoice_custom_field_scope(invoice_type) else {
        return Ok(patch.keys().next().cloned());
    };
    check_unknown_custom_field_key(connection, scope, patch)
}

#[cfg(test)]
mod test {
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;
    use repository::{
        InvoiceType, CustomFieldDisplayMode, CustomFieldKind, CustomFieldScopeRow,
        CustomFieldScopeRowRepository, CustomFieldRow, CustomFieldRowRepository, CustomFieldValueType,
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
    async fn check_unknown_custom_fields_key_validates_scope() {
        let (_, connection, _, _) = setup_all(
            "check_unknown_custom_fields_key_validates_scope",
            MockDataInserts::none(),
        )
        .await;

        CustomFieldRowRepository::new(&connection)
            .upsert_one(&CustomFieldRow {
                id: "inbound_shipment_category".to_string(),
                key: "inbound_shipment_category".to_string(),
                name: "Category".to_string(),
                value_type: CustomFieldValueType::Option,
                kind: CustomFieldKind::Legacy,
                deleted_datetime: None,
            })
            .unwrap();
        CustomFieldScopeRowRepository::new(&connection)
            .upsert_one(&CustomFieldScopeRow {
                id: "inbound_shipment_category__inbound_shipment".to_string(),
                custom_field_id: "inbound_shipment_category".to_string(),
                scope: "inbound_shipment".to_string(),
                display_mode: CustomFieldDisplayMode::Visible,
            })
            .unwrap();

        // Known key for the type's scope passes.
        assert_eq!(
            check_unknown_custom_fields_key(
                &connection,
                &InvoiceType::InboundShipment,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            None
        );
        // Unknown key is reported.
        assert_eq!(
            check_unknown_custom_fields_key(
                &connection,
                &InvoiceType::InboundShipment,
                &patch(&[("not_a_custom_field", json!("x"))]),
            )
            .unwrap(),
            Some("not_a_custom_field".to_string())
        );
        // Another scope's key is unknown for this type.
        assert_eq!(
            check_unknown_custom_fields_key(
                &connection,
                &InvoiceType::OutboundShipment,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            Some("inbound_shipment_category".to_string())
        );
        // Types without a custom_fields scope allow no keys.
        assert_eq!(
            check_unknown_custom_fields_key(
                &connection,
                &InvoiceType::Repack,
                &patch(&[("inbound_shipment_category", json!("CAT_1"))]),
            )
            .unwrap(),
            Some("inbound_shipment_category".to_string())
        );
    }

    #[test]
    fn apply_custom_fields_patch_merges_and_deletes() {
        // None patch leaves the blob untouched.
        assert_eq!(
            apply_custom_fields_patch(Some(json!({ "a": "1" })), None),
            Some(json!({ "a": "1" }))
        );
        // Patch merges over existing, preserving untouched keys.
        assert_eq!(
            apply_custom_fields_patch(
                Some(json!({ "a": "1", "keep": "2" })),
                Some(patch(&[("a", json!("new"))])),
            ),
            Some(json!({ "a": "new", "keep": "2" }))
        );
        // Null deletes the key; an emptied blob becomes None.
        assert_eq!(
            apply_custom_fields_patch(
                Some(json!({ "a": "1" })),
                Some(patch(&[("a", json!(null))])),
            ),
            None
        );
        // Patch onto an empty blob creates it.
        assert_eq!(
            apply_custom_fields_patch(None, Some(patch(&[("a", json!("1"))]))),
            Some(json!({ "a": "1" }))
        );
    }
}
