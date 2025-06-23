use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderRow, PurchaseOrderStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::{empty_str_as_option, object_fields_as_option},
    translations::{
        master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
        store::StoreTranslation, PullTranslateResult, PushTranslateResult, SyncTranslation,
    },
};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyPurchaseOrderStatus {
    New,
    Confirmed,
    Authorised,
    Finalised,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct PurchaseOrderOmsFields {
    // TODO add complete fields we want to sync
    #[serde(default)]
    // TODO fix why can't this be empty string with our deseialisation pattern
    // #[serde(deserialize_with = "empty_str_as_option")]
    pub foreign_exchange_rate: Option<f64>,
    #[serde(default)]
    pub shipping_method: Option<String>,
    #[serde(default)]
    pub sent_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub contract_signed_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub advance_paid_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub delivered_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub received_at_port_datetime: Option<NaiveDate>,
    #[serde(default)]
    pub expected_delivery_datetime: Option<NaiveDate>,
    #[serde(default)]
    pub heading_message: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPurchaseOrderRow {
    #[serde(default)]
    #[serde(rename = "name_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_name_link_id: Option<String>,
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "creation_date")]
    pub created_datetime: NaiveDateTime,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    // TODO fix will fail on not string
    pub target_months: Option<f64>,
    pub status: LegacyPurchaseOrderStatus,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(default)]
    #[serde(rename = "currency_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub currency_id: Option<String>,
    // pub inv_sub_total: String,
    // pub freight: String,
    // pub cost_in_local_currency: String,
    // pub curr_rate: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub reference: Option<String>,
    // pub lines: String,
    // pub requested_delivery_date: String,
    // pub locked: String,
    #[serde(default)]
    #[serde(rename = "confirmed_date")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub confirmed_datetime: Option<NaiveDateTime>,
    // assume this is user_id - though does not reference user id in OG
    #[serde(default)]
    #[serde(rename = "created_by")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub user_id: Option<String>,
    // pub last_edited_by: String,
    // pub Order_total_after_discount: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_agent: Option<String>,
    // pub delivery_method: String,
    #[serde(default)]
    #[serde(rename = "authorizing_officer_1")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub authorising_officer_1: Option<String>,
    #[serde(default)]
    #[serde(rename = "authorizing_officer_2")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub authorising_officer_2: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub freight_conditions: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub additional_instructions: Option<String>,
    // pub total_foreign_currency_expected: String,

    // pub total_local_currency_expected: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    // TODO fix will fail on not string
    pub agent_commission: Option<f64>,
    // TODO fix will fail on not string
    #[serde(default)]
    // TODO fix will fail on not string
    #[serde(deserialize_with = "empty_str_as_option")]
    pub document_charge: Option<f64>,
    // TODO fix will fail on not string
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub communications_charge: Option<f64>,
    // TODO fix will fail on not string
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub insurance_charge: Option<f64>,
    // TODO fix will fail on not string
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub freight_charge: Option<f64>,
    // TODO fix will fail on not string

    // pub po_sent_date: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_discount_amount: Option<f64>,
    // pub Order_total_before_discount: String,

    // TODO fix will fail on not string
    #[serde(default)]
    #[serde(rename = "inv_discount_amount")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_discount_percentage: Option<f64>,
    // pub quote_ID: String,
    // pub editedRemotely: String,
    // pub heading_message: String,
    // pub budget_period_ID: String,
    // pub category_ID: String,
    // pub include_in_on_order_calcs: String,
    // pub colour: String,
    // pub user_field_1: String,
    // pub Date_contract_signed: String,
    // pub Date_advance_payment: String,
    // pub Date_goods_received_at_port: String,
    // pub is_authorised: String,
    // pub auth_checksum: String,
    #[serde(default)]
    #[serde(rename = "donor_id")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub donor_link_id: Option<String>,
    // pub user_field_2: String,
    #[serde(rename = "serial_number")]
    pub purchase_order_number: i64,
    // pub linked_transaction_ID: String,
    // pub lookBackMonths: String,
    // pub custom_data: String,
    // pub minimumExpiryDate: String,
    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<PurchaseOrderOmsFields>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PurchaseOrderTranslation)
}

pub(super) struct PurchaseOrderTranslation;

impl SyncTranslation for PurchaseOrderTranslation {
    fn table_name(&self) -> &str {
        "purchase_order"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            PeriodTranslation.table_name(),
            MasterListTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::PurchaseOrder)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyPurchaseOrderRow {
            id,
            user_id,
            purchase_order_number,
            store_id,
            supplier_name_link_id,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            reference,
            currency_id,
            supplier_agent,
            authorising_officer_1,
            authorising_officer_2,
            additional_instructions,
            agent_commission,
            document_charge,
            communications_charge,
            insurance_charge,
            freight_charge,
            freight_conditions,
            oms_fields,
        } = serde_json::from_str::<LegacyPurchaseOrderRow>(&sync_record.data)?;

        let result = PurchaseOrderRow {
            id: id,
            user_id,
            purchase_order_number,
            store_id,
            supplier_name_link_id,
            status: from_legacy_status(&status),
            created_datetime,
            confirmed_datetime,
            // no direct mapping from legacy
            delivered_datetime: oms_fields.clone().and_then(|o| o.delivered_datetime),
            target_months,
            comment,
            // no direct mapping from legacy
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            reference,
            currency_id,
            // no direct mapping from legacy
            foreign_exchange_rate: oms_fields.clone().and_then(|o| o.foreign_exchange_rate),
            // no direct mapping from legacy
            shipping_method: oms_fields.clone().and_then(|o| o.shipping_method),
            // no direct mapping from legacy
            sent_datetime: oms_fields.clone().and_then(|o| o.sent_datetime),
            // no direct mapping from legacy
            contract_signed_datetime: oms_fields.clone().and_then(|o| o.contract_signed_datetime),
            // no direct mapping from legacy
            advance_paid_datetime: oms_fields.clone().and_then(|o| o.advance_paid_datetime),
            // no direct mapping from legacy
            received_at_port_datetime: oms_fields.clone().and_then(|o| o.received_at_port_datetime),
            // no direct mapping from legacy
            expected_delivery_datetime: oms_fields
                .clone()
                .and_then(|o| o.expected_delivery_datetime),
            supplier_agent,
            authorising_officer_1,
            authorising_officer_2,
            additional_instructions,
            // no direct mapping from legacy
            heading_message: oms_fields.and_then(|o| o.heading_message),
            agent_commission,
            document_charge,
            communications_charge,
            insurance_charge,
            freight_charge,
            freight_conditions,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    // TODO add try_translate_from_delete_sync_record

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let PurchaseOrderRow {
            id,
            store_id,
            user_id,
            supplier_name_link_id,
            purchase_order_number,
            status,
            created_datetime,
            confirmed_datetime,
            delivered_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_datetime,
            contract_signed_datetime,
            advance_paid_datetime,
            received_at_port_datetime,
            expected_delivery_datetime,
            supplier_agent,
            authorising_officer_1,
            authorising_officer_2,
            additional_instructions,
            heading_message,
            agent_commission,
            document_charge,
            communications_charge,
            insurance_charge,
            freight_charge,
            freight_conditions,
        } = PurchaseOrderRepository::new(connection)
            .query_by_filter(
                PurchaseOrderFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Purchase Order not found"))?;

        let oms_fields = if foreign_exchange_rate.is_some()
            || shipping_method.is_some()
            || sent_datetime.is_some()
            || contract_signed_datetime.is_some()
            || advance_paid_datetime.is_some()
            || received_at_port_datetime.is_some()
            || expected_delivery_datetime.is_some()
            || heading_message.is_some()
            || delivered_datetime.is_some()
        {
            Some(PurchaseOrderOmsFields {
                foreign_exchange_rate,
                shipping_method,
                sent_datetime,
                contract_signed_datetime,
                advance_paid_datetime,
                received_at_port_datetime,
                expected_delivery_datetime,
                heading_message,
                delivered_datetime,
            })
        } else {
            None
        };

        let legacy_row = LegacyPurchaseOrderRow {
            id,
            created_datetime,
            target_months,
            status: to_legacy_status(&status),
            comment,
            currency_id,
            reference,
            confirmed_datetime,
            user_id,
            store_id,
            supplier_agent,
            authorising_officer_1,
            authorising_officer_2,
            freight_conditions,
            additional_instructions,
            agent_commission,
            document_charge,
            communications_charge,
            insurance_charge,
            freight_charge,
            supplier_discount_amount,
            supplier_discount_percentage,
            donor_link_id,
            purchase_order_number,
            supplier_name_link_id,
            oms_fields,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }
}

fn from_legacy_status(status: &LegacyPurchaseOrderStatus) -> PurchaseOrderStatus {
    let oms_status = match status {
        LegacyPurchaseOrderStatus::New => PurchaseOrderStatus::New,
        LegacyPurchaseOrderStatus::Confirmed => PurchaseOrderStatus::Confirmed,
        LegacyPurchaseOrderStatus::Authorised => PurchaseOrderStatus::Authorised,
        LegacyPurchaseOrderStatus::Finalised => PurchaseOrderStatus::Finalised,
    };
    oms_status
}

fn to_legacy_status(status: &PurchaseOrderStatus) -> LegacyPurchaseOrderStatus {
    let legacy_status = match status {
        PurchaseOrderStatus::New => LegacyPurchaseOrderStatus::New,
        PurchaseOrderStatus::Confirmed => LegacyPurchaseOrderStatus::Confirmed,
        PurchaseOrderStatus::Authorised => LegacyPurchaseOrderStatus::Authorised,
        PurchaseOrderStatus::Finalised => LegacyPurchaseOrderStatus::Finalised,
    };
    legacy_status
}

#[cfg(test)]
mod tests {
    use crate::sync::translations::ToSyncRecordTranslationType;

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_purchase_order_translation() {
        use crate::sync::test::test_data::purchase_order as test_data;
        let translator = PurchaseOrderTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_purchase_order_line_translation",
            MockDataInserts::none().purchase_order(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        // TODO add delete translation test
    }

    // TODO add test for push to sync record translation

    #[actix_rt::test]
    async fn test_purchase_order_translation_to_sync_record() {
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_line_translation_to_sync_record",
            MockDataInserts::none().purchase_order(),
        )
        .await;

        // let

        let translator = PurchaseOrderTranslation {};
        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new().table_name(ChangelogTableName::PurchaseOrder.equal_to()),
                ),
            )
            .unwrap();

        for changelog in changelogs {
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
        }
    }
}
