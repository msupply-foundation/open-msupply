use crate::sync::translations::{
    invoice::InvoiceTranslation, purchase_order::PurchaseOrderTranslation, utils::clear_invalid_fk,
    PullTranslateResult, PushTranslateResult, SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    goods_received_row::{
        GoodsReceivedDelete, GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus,
    },
    ChangelogRow, ChangelogTableName, InvoiceRowRepository, PurchaseOrderRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, date_to_isostring, empty_str_as_option, zero_date_as_option,
};

#[derive(Deserialize, Serialize, Debug, PartialEq, Clone)]
pub enum LegacyGoodsReceivedStatus {
    #[serde(alias = "fn")]
    Finalised,
    #[serde(alias = "nw")]
    New,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyGoodsReceived {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(default)]
    #[serde(rename = "purchase_order_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub purchase_order_id: Option<String>,
    #[serde(default)]
    #[serde(rename = "linked_transaction_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub inbound_shipment_id: Option<String>,
    #[serde(rename = "serial_number")]
    pub goods_received_number: i64,
    pub status: LegacyGoodsReceivedStatus,
    #[serde(rename = "entry_date")]
    #[serde(serialize_with = "date_to_isostring")]
    pub created_datetime: NaiveDate,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "received_date")]
    pub received_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(default)]
    #[serde(rename = "supplier_reference")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_reference: Option<String>,
    #[serde(default)]
    #[serde(rename = "donor_id")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub donor_link_id: Option<String>,
    #[serde(default)]
    #[serde(rename = "user_id_created")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_by: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedTranslation)
}

pub(super) struct GoodsReceivedTranslation;

impl SyncTranslation for GoodsReceivedTranslation {
    fn table_name(&self) -> &str {
        "Goods_received"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            PurchaseOrderTranslation.table_name(),
            InvoiceTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::GoodsReceived)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy: LegacyGoodsReceived = serde_json::from_str(&sync_record.data)?;

        let purchase_order_id = clear_invalid_fk(
            connection,
            "goods_received",
            &legacy.id,
            "purchase_order_id",
            legacy.purchase_order_id,
            |c, id| PurchaseOrderRowRepository::new(c).find_one_by_id(id),
        )?;
        let inbound_shipment_id = clear_invalid_fk(
            connection,
            "goods_received",
            &legacy.id,
            "inbound_shipment_id",
            legacy.inbound_shipment_id,
            |c, id| InvoiceRowRepository::new(c).find_one_by_id(id),
        )?;

        let result = GoodsReceivedRow {
            id: legacy.id,
            store_id: legacy.store_id,
            purchase_order_id,
            inbound_shipment_id,
            goods_received_number: legacy.goods_received_number,
            status: match legacy.status {
                LegacyGoodsReceivedStatus::Finalised => GoodsReceivedStatus::Finalised,
                LegacyGoodsReceivedStatus::New => GoodsReceivedStatus::New,
            },
            received_date: legacy.received_date,
            comment: legacy.comment,
            supplier_reference: legacy.supplier_reference,
            donor_link_id: legacy.donor_link_id,
            created_datetime: legacy.created_datetime.and_hms_opt(0, 0, 0).unwrap(),
            finalised_datetime: None,
            created_by: legacy.created_by,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = GoodsReceivedRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("GoodsReceived not found"))?;
        let legacy = LegacyGoodsReceived {
            id: row.id,
            store_id: row.store_id,
            purchase_order_id: row.purchase_order_id,
            inbound_shipment_id: row.inbound_shipment_id,
            goods_received_number: row.goods_received_number,
            status: match row.status {
                GoodsReceivedStatus::New => LegacyGoodsReceivedStatus::New,
                GoodsReceivedStatus::Finalised => LegacyGoodsReceivedStatus::Finalised,
            },
            created_datetime: row.created_datetime.date(),
            received_date: row.received_date,
            comment: row.comment,
            supplier_reference: row.supplier_reference,
            donor_link_id: row.donor_link_id,
            created_by: row.created_by,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(GoodsReceivedDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translations::{
        goods_received::GoodsReceivedTranslation, PullTranslateResult, SyncTranslation,
    };
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_outbound_shipment_a, mock_store_a, MockData, MockDataInserts},
        purchase_order_row::PurchaseOrderRow,
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        InvoiceRow, SyncAction, SyncBufferRow,
    };

    #[actix_rt::test]
    async fn test_goods_received_translation() {
        use crate::sync::test::test_data::goods_received as test_data;
        let translator = GoodsReceivedTranslation {};

        // FK validation requires the referenced purchase_order and invoice to exist
        let (_, connection, _, _) = setup_all_with_data(
            "test_goods_received_translation",
            MockDataInserts::none().names().stores(),
            MockData {
                purchase_order: vec![PurchaseOrderRow {
                    id: "sync_test_purchase_order_1".to_string(),
                    store_id: mock_store_a().id,
                    supplier_name_link_id: "name_a".to_string(),
                    purchase_order_number: 1,
                    created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                    ..Default::default()
                }],
                invoices: vec![InvoiceRow {
                    id: "12e889c0f0d211eb8dddb54df6d741bc".to_string(),
                    ..mock_outbound_shipment_a()
                }],
                ..Default::default()
            },
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_goods_received_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = GoodsReceivedTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_goods_received_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "Goods_received".to_string(),
            record_id: "GR_FK_INVALID".to_string(),
            data: r#"{
                "ID": "GR_FK_INVALID",
                "store_ID": "store_a",
                "purchase_order_ID": "does_not_exist_po",
                "linked_transaction_ID": "does_not_exist_invoice",
                "serial_number": 1,
                "status": "nw",
                "entry_date": "2024-01-01",
                "received_date": "0000-00-00",
                "comment": "",
                "supplier_reference": "",
                "donor_id": "",
                "user_id_created": ""
            }"#
            .to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(
            debug.contains("purchase_order_id: None"),
            "{}",
            format!("expected purchase_order_id None; got:\n{debug}")
        );
        assert!(
            debug.contains("inbound_shipment_id: None"),
            "{}",
            format!("expected inbound_shipment_id None; got:\n{debug}")
        );
        let _ = matches!(result, PullTranslateResult::IntegrationOperations(_));

        let logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        assert_eq!(fk_errors.len(), 2, "got {fk_errors:?}");
    }
}
