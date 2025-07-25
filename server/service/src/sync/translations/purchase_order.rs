use chrono::NaiveDate;
use chrono::NaiveDateTime;
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderRow, PurchaseOrderStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, object_fields_as_option, zero_date_as_option,
    zero_f64_as_none,
};

use crate::sync::sync_utils::map_name_link_id_to_name_id;
use crate::sync::sync_utils::map_optional_name_link_id_to_name_id;
use crate::sync::translations::{
    name::NameTranslation, store::StoreTranslation, PullTranslateResult, PushTranslateResult,
    SyncTranslation,
};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyPurchaseOrderStatus {
    /// new
    #[serde(rename = "nw")]
    Nw,
    /// suggested
    #[serde(rename = "sg")]
    Sg,
    /// confirmed
    #[serde(rename = "cn")]
    Cn,
    /// finalised
    #[serde(rename = "fn")]
    #[serde(alias = "FN")]
    Fn,
    /// Bucket to catch all other variants
    #[serde(other)]
    Others,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct PurchaseOrderOmsFields {
    #[serde(default)]
    pub expected_delivery_date: Option<NaiveDate>,
    #[serde(default)]
    pub created_datetime: NaiveDateTime,
    #[serde(default)]
    pub confirmed_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub sent_datetime: Option<NaiveDateTime>,
}

/** Example record
 * {
    "Date_advance_payment": "0000-00-00",
    "Date_contract_signed": "0000-00-00",
    "Date_goods_received_at_port": "0000-00-00",
    "ID": "74776741F45F47CBB3214143D27308B2",
    "Order_total_after_discount": 1000,
    "Order_total_before_discount": 1000,
    "additional_instructions": "",
    "agent_commission": 0,
    "auth_checksum": "be3e0b73e1762782fc8d608ebaf760e1",
    "authorizing_officer_1": "",
    "authorizing_officer_2": "",
    "budget_period_ID": "",
    "category_ID": "",
    "colour": 0,
    "comment": "",
    "communications_charge": 0,
    "confirm_date": "2024-11-27",
    "cost_in_local_currency": 449224.99,
    "created_by": "0763E2E3053D4C478E1E6B6B03FEC207",
    "creation_date": "2021-03-11",
    "curr_rate": 449.224988,
    "currency_ID": "8009D512AC0E4FD78625E3C8273B0171",
    "custom_data": null,
    "delivery_method": "",
    "document_charge": 0,
    "donor_id": "",
    "editedRemotely": false,
    "freight": 0,
    "freight_charge": 0,
    "freight_conditions": "",
    "heading_message": "",
    "include_in_on_order_calcs": false,
    "insurance_charge": 0,
    "inv_discount_amount": 0,
    "inv_sub_total": 0,
    "is_authorised": true,
    "last_edited_by": "0763E2E3053D4C478E1E6B6B03FEC207",
    "lines": 1,
    "linked_transaction_ID": "",
    "locked": false,
    "lookBackMonths": 0,
    "minimumExpiryDate": "0000-00-00",
    "name_ID": "A2815A74F4F24181B637D510A978359E",
    "oms_fields": null,
    "po_sent_date": "2024-11-27",
    "quote_ID": "",
    "reference": "",
    "requested_delivery_date": "2021-03-11",
    "serial_number": 16,
    "status": "cn",
    "store_ID": "D77F67339BF8400886D009178F4962E1",
    "supplier_agent": "",
    "supplier_discount_amount": 0,
    "target_months": 0,
    "total_foreign_currency_expected": 0,
    "total_local_currency_expected": 0,
    "user_field_1": "",
    "user_field_2": ""
}
 */

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPurchaseOrderRow {
    #[serde(rename = "name_ID")]
    pub name_id: String,
    #[serde(rename = "ID")]
    pub id: String,
    pub creation_date: NaiveDate,
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
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub confirm_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_by: Option<String>,
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
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub agent_commission: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub document_charge: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub communications_charge: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub insurance_charge: Option<f64>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub freight_charge: Option<f64>,
    #[serde(default)]
    pub supplier_discount_amount: f64,
    #[serde(default)]
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub curr_rate: Option<f64>,
    #[serde(default)]
    #[serde(rename = "Order_total_before_discount")]
    pub order_total_before_discount: f64,
    #[serde(default)]
    #[serde(rename = "Order_total_after_discount")]
    pub order_total_after_discount: f64,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub donor_id: Option<String>,
    #[serde(rename = "serial_number")]
    pub purchase_order_number: i64,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub heading_message: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub delivery_method: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub requested_delivery_date: Option<NaiveDate>,
    #[serde(rename = "po_sent_date")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub sent_date: Option<NaiveDate>,
    #[serde(rename = "Date_contract_signed")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub contract_signed_date: Option<NaiveDate>,
    #[serde(rename = "Date_advance_payment")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub advance_paid_date: Option<NaiveDate>,
    #[serde(rename = "Date_goods_received_at_port")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub received_at_port_date: Option<NaiveDate>,
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
        vec![NameTranslation.table_name(), StoreTranslation.table_name()]
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
            purchase_order_number,
            status,
            target_months,
            comment,
            supplier_discount_amount,
            reference,
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
            delivery_method,
            requested_delivery_date,
            sent_date,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            name_id,
            creation_date,
            currency_id,
            confirm_date: legacy_confirm_date,
            created_by,
            store_id,
            donor_id,
            curr_rate,
            order_total_before_discount,
            order_total_after_discount,
        } = serde_json::from_str::<LegacyPurchaseOrderRow>(&sync_record.data)?;

        let created_datetime = match oms_fields.clone() {
            Some(oms) => oms.created_datetime,
            None => creation_date.and_hms_opt(0, 0, 0).unwrap_or_default(),
        };

        let confirmed_datetime = match oms_fields.clone() {
            Some(oms) => oms.confirmed_datetime,
            None => legacy_confirm_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default()),
        };

        let sent_datetime = match oms_fields.clone() {
            Some(oms) => oms.sent_datetime,
            None => sent_date.map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default()),
        };

        let result = PurchaseOrderRow {
            id,
            created_by,
            purchase_order_number,
            store_id,
            supplier_name_link_id: name_id,
            status: from_legacy_status(&status),
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_amount,
            donor_link_id: donor_id,
            reference,
            currency_id,
            foreign_exchange_rate: curr_rate,
            shipping_method: delivery_method,
            sent_datetime,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            requested_delivery_date,
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
            order_total_before_discount,
            order_total_after_discount,
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
            created_by,
            supplier_name_link_id,
            purchase_order_number,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_amount,
            donor_link_id,
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_datetime,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            expected_delivery_date,
            requested_delivery_date,
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
            order_total_before_discount,
            order_total_after_discount,
        } = PurchaseOrderRepository::new(connection)
            .query_by_filter(
                PurchaseOrderFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Purchase Order not found"))?;

        let oms_fields = PurchaseOrderOmsFields {
            expected_delivery_date,
            created_datetime,
            confirmed_datetime,
            sent_datetime,
        };

        let donor_id = map_optional_name_link_id_to_name_id(connection, donor_link_id)?;
        let supplier_id = map_name_link_id_to_name_id(connection, supplier_name_link_id)?;

        let legacy_row = LegacyPurchaseOrderRow {
            id,
            target_months,
            status: to_legacy_status(&status),
            comment,
            currency_id,
            reference,
            created_by,
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
            purchase_order_number,
            heading_message,
            requested_delivery_date,
            delivery_method: shipping_method,
            sent_date: sent_datetime.map(|d| d.date()),
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
            name_id: supplier_id,
            creation_date: created_datetime.date(),
            confirm_date: confirmed_datetime.map(|d| d.date()),
            curr_rate: foreign_exchange_rate,
            order_total_before_discount,
            order_total_after_discount,
            donor_id,
            oms_fields: Some(oms_fields),
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
        LegacyPurchaseOrderStatus::Nw => PurchaseOrderStatus::New,
        LegacyPurchaseOrderStatus::Sg => PurchaseOrderStatus::New,
        LegacyPurchaseOrderStatus::Cn => PurchaseOrderStatus::Confirmed,
        LegacyPurchaseOrderStatus::Fn => PurchaseOrderStatus::Finalised,
        LegacyPurchaseOrderStatus::Others => PurchaseOrderStatus::New, // Default to New for
    };
    oms_status
}

fn to_legacy_status(status: &PurchaseOrderStatus) -> LegacyPurchaseOrderStatus {
    let legacy_status = match status {
        PurchaseOrderStatus::New => LegacyPurchaseOrderStatus::Nw,
        PurchaseOrderStatus::Confirmed => LegacyPurchaseOrderStatus::Cn,
        PurchaseOrderStatus::Authorised => LegacyPurchaseOrderStatus::Cn, // should also set is_authorised to true
        PurchaseOrderStatus::Finalised => LegacyPurchaseOrderStatus::Fn,
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
            // println!("Translating record: {:?}", record.sync_buffer_row.data);
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
