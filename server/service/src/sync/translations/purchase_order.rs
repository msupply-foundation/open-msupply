use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderRow, PurchaseOrderStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, object_fields_as_option, zero_date_as_option,
};

use crate::sync::translations::{
    master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
    store::StoreTranslation, PullTranslateResult, PushTranslateResult, SyncTranslation,
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
    #[serde(default)]
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
    pub received_at_port_date: Option<NaiveDate>,
    #[serde(default)]
    pub expected_delivery_date: Option<NaiveDate>,
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
    pub created_date: NaiveDate,
    #[serde(default)]
    pub target_months: Option<f64>,
    pub status: LegacyPurchaseOrderStatus,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(default)]
    #[serde(rename = "currency_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub currency_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub reference: Option<String>,
    #[serde(rename = "confirm_date")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub confirmed_date: Option<NaiveDate>,
    // assume this is user_id - though does not reference user id in OG
    #[serde(default)]
    #[serde(rename = "created_by")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub user_id: Option<String>,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_agent: Option<String>,
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
    #[serde(default)]
    pub agent_commission: Option<f64>,
    #[serde(default)]
    pub document_charge: Option<f64>,
    #[serde(default)]
    pub communications_charge: Option<f64>,
    #[serde(default)]
    pub insurance_charge: Option<f64>,
    #[serde(default)]
    pub freight_charge: Option<f64>,
    #[serde(default)]
    pub supplier_discount_amount: Option<f64>,
    #[serde(default)]
    #[serde(rename = "inv_discount_amount")]
    pub supplier_discount_percentage: Option<f64>,
    #[serde(default)]
    #[serde(rename = "donor_id")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub donor_link_id: Option<String>,
    #[serde(rename = "serial_number")]
    pub purchase_order_number: i64,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub heading_message: Option<String>,
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
            created_date,
            confirmed_date,
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
            heading_message,
            oms_fields,
        } = serde_json::from_str::<LegacyPurchaseOrderRow>(&sync_record.data)?;

        let result = PurchaseOrderRow {
            id: id,
            user_id,
            purchase_order_number,
            store_id,
            supplier_name_link_id,
            status: from_legacy_status(&status),
            created_date,
            confirmed_date,
            delivered_datetime: oms_fields.clone().and_then(|o| o.delivered_datetime),
            target_months,
            comment,
            supplier_discount_percentage,
            supplier_discount_amount,
            donor_link_id,
            reference,
            currency_id,
            foreign_exchange_rate: oms_fields.clone().and_then(|o| o.foreign_exchange_rate),
            shipping_method: oms_fields.clone().and_then(|o| o.shipping_method),
            sent_datetime: oms_fields.clone().and_then(|o| o.sent_datetime),
            contract_signed_datetime: oms_fields.clone().and_then(|o| o.contract_signed_datetime),
            advance_paid_datetime: oms_fields.clone().and_then(|o| o.advance_paid_datetime),
            received_at_port_date: oms_fields.clone().and_then(|o| o.received_at_port_date),
            expected_delivery_date: oms_fields.clone().and_then(|o| o.expected_delivery_date),
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
            created_date,
            confirmed_date,
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
            received_at_port_date,
            expected_delivery_date,
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
            || received_at_port_date.is_some()
            || expected_delivery_date.is_some()
            || delivered_datetime.is_some()
        {
            Some(PurchaseOrderOmsFields {
                foreign_exchange_rate,
                shipping_method,
                sent_datetime,
                contract_signed_datetime,
                advance_paid_datetime,
                received_at_port_date,
                expected_delivery_date,
                delivered_datetime,
            })
        } else {
            None
        };

        let legacy_row = LegacyPurchaseOrderRow {
            id,
            created_date,
            target_months,
            status: to_legacy_status(&status),
            comment,
            currency_id,
            reference,
            confirmed_date,
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
            heading_message,
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
            "test_purchase_order_translation",
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

    #[actix_rt::test]
    async fn test_purchase_order_translation_to_sync_record() {
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_translation_to_sync_record",
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
