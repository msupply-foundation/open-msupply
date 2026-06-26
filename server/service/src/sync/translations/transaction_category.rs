use chrono::Utc;
use repository::{
    PropertyOptionV2Row, PropertyOptionV2RowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::central_mapping_properties::keys;
use crate::sync::CentralServerConfig;

use super::{PullTranslateResult, SyncTranslation};

/// Map a `transaction_category.type` to the `property_v2.id` of the OPTION
/// mapping property its categories belong to. The key *is* the id (see
/// `central_mapping_properties`), so these must match the category keys seeded
/// there. "pi2" is the second prescription dimension (the OG Patient Type
/// dropdown, stored in `transact.category2_ID`).
///
/// OG types with no OMS UI surface are not mapped: "sr" (repack), "bu" (build),
/// "in" (inventory adjustment), "te" (tender).
fn transaction_category_property_id(category_type: &str) -> Option<&'static str> {
    match category_type {
        "si" => Some(keys::INBOUND_SHIPMENT_CATEGORY),
        "ci" => Some(keys::OUTBOUND_SHIPMENT_CATEGORY),
        "pi" => Some(keys::PRESCRIPTION_CATEGORY),
        "sc" => Some(keys::SUPPLIER_RETURN_CATEGORY),
        "cc" => Some(keys::CUSTOMER_RETURN_CATEGORY),
        "pi2" => Some(keys::PRESCRIPTION_CATEGORY_2),
        _ => None,
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTransactionCategoryRow {
    ID: String,
    category: String,
    #[serde(rename = "type")]
    r#type: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(TransactionCategoryTranslation)
}

pub(super) struct TransactionCategoryTranslation;
impl SyncTranslation for TransactionCategoryTranslation {
    fn table_names(&self) -> Vec<&str> {
        vec!["transaction_category"]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyTransactionCategoryRow>()?;

        let Some(property_id) = transaction_category_property_id(&data.r#type) else {
            return Ok(PullTranslateResult::Ignored(format!(
                "Unsupported transaction category type {:?}",
                data.r#type
            )));
        };

        // PropertiesV2-only, central-only: each category record becomes a
        // `property_option_v2` row under its type's mapping property. There is
        // no relational counterpart. The option `id` equals the category id so
        // the invoice's stored `category_ID` resolves; `key` is also the id
        // (`UNIQUE (property_id, key)` — OG doesn't enforce unique codes, so
        // the `code` field can't be the key). Flat: `master_category_ID`
        // grouping is ignored. Remotes receive these over v7; they must not
        // author them locally.
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Transaction category options are authored on central only".to_string(),
            ));
        }

        Ok(PullTranslateResult::upsert(PropertyOptionV2Row {
            id: data.ID.clone(),
            property_id: property_id.to_string(),
            key: data.ID,
            name: data.category,
            parent_option_id: None,
            deleted_datetime: None,
        }))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // Central-only soft-delete (re-upsert with `deleted_datetime` set) so the
        // option set tracks 4D category removals and the read dataloader filters
        // it out — same as the item/name category translators.
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Transaction category options are authored on central only".to_string(),
            ));
        }

        let Some(option) = PropertyOptionV2RowRepository::new(connection)
            .find_one_by_id(&sync_record.record_id)?
        else {
            return Ok(PullTranslateResult::Ignored(
                "No matching transaction category option".to_string(),
            ));
        };

        Ok(PullTranslateResult::upsert(PropertyOptionV2Row {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..option
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, PropertyKindV2, PropertyOptionV2RowRepository,
        PropertyV2Row, PropertyV2RowRepository, PropertyValueTypeV2, SyncAction, SyncRecordData,
    };

    fn sync_record(category_type: &str) -> SyncBufferRow {
        SyncBufferRow {
            table_name: "transaction_category".to_string(),
            record_id: "CAT_SI".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "CAT_SI",
                "category": "Donation",
                "type": category_type,
                "code": "don",
                "master_category_ID": "",
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn test_transaction_category_translation() {
        use crate::sync::test_util_set_is_central_server;
        let translator = TransactionCategoryTranslation;

        let (_, connection, _, _) = setup_all(
            "test_transaction_category_translation",
            MockDataInserts::none(),
        )
        .await;

        // On central, each supported type maps to its own property; the option
        // id/key equal the category id and the hierarchy stays flat.
        test_util_set_is_central_server(true);
        for (category_type, property_id) in [
            ("si", "inbound_shipment_category"),
            ("ci", "outbound_shipment_category"),
            ("pi", "prescription_category"),
            ("sc", "supplier_return_category"),
            ("cc", "customer_return_category"),
            ("pi2", "prescription_category_2"),
        ] {
            let record = sync_record(category_type);
            assert!(translator.should_translate_from_sync_record(&record));
            let result = translator
                .try_translate_from_upsert_sync_record(&connection, &record)
                .unwrap();
            assert_eq!(
                result,
                PullTranslateResult::upsert(PropertyOptionV2Row {
                    id: "CAT_SI".to_string(),
                    property_id: property_id.to_string(),
                    key: "CAT_SI".to_string(),
                    name: "Donation".to_string(),
                    parent_option_id: None,
                    deleted_datetime: None,
                }),
            );
        }

        // Unsupported OG types (no OMS UI surface) are ignored.
        for category_type in ["sr", "bu", "in", "te", ""] {
            let result = translator
                .try_translate_from_upsert_sync_record(&connection, &sync_record(category_type))
                .unwrap();
            assert!(
                matches!(result, PullTranslateResult::Ignored(_)),
                "type {category_type:?} must be ignored"
            );
        }

        // On a remote, nothing is authored (options arrive over v7).
        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record("si"))
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));
    }

    #[actix_rt::test]
    async fn test_transaction_category_delete_soft_deletes_option() {
        use crate::sync::test_util_set_is_central_server;
        let translator = TransactionCategoryTranslation;

        let (_, connection, _, _) = setup_all(
            "test_transaction_category_delete_soft_deletes_option",
            MockDataInserts::none(),
        )
        .await;

        // FK target for the option row.
        PropertyV2RowRepository::new(&connection)
            .upsert_one(&PropertyV2Row {
                id: "inbound_shipment_category".to_string(),
                key: "inbound_shipment_category".to_string(),
                name: "Category".to_string(),
                value_type: PropertyValueTypeV2::Option,
                kind: PropertyKindV2::Legacy,
                deleted_datetime: None,
            })
            .unwrap();
        PropertyOptionV2RowRepository::new(&connection)
            .upsert_one(&PropertyOptionV2Row {
                id: "CAT_SI".to_string(),
                property_id: "inbound_shipment_category".to_string(),
                key: "CAT_SI".to_string(),
                name: "Donation".to_string(),
                parent_option_id: None,
                deleted_datetime: None,
            })
            .unwrap();

        let delete_record = SyncBufferRow {
            table_name: "transaction_category".to_string(),
            record_id: "CAT_SI".to_string(),
            action: SyncAction::Delete,
            ..Default::default()
        };

        test_util_set_is_central_server(true);
        let result = translator
            .try_translate_from_delete_sync_record(&connection, &delete_record)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(
            debug.contains("deleted_datetime: Some"),
            "delete must soft-delete the option: {debug}"
        );

        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_delete_sync_record(&connection, &delete_record)
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));
    }
}
