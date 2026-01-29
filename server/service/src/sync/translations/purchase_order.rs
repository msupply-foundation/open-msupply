use crate::sync::{
    sync_utils::{map_name_link_id_to_name_id, map_optional_name_link_id_to_name_id},
    translations::{
        name::NameTranslation, store::StoreTranslation, PullTranslateResult, PushTranslateResult,
        SyncTranslation,
    },
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderDelete, PurchaseOrderFilter,
    PurchaseOrderRepository, PurchaseOrderRow, PurchaseOrderStatsRow, PurchaseOrderStatus,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, object_fields_as_option, zero_date_as_option,
    zero_f64_as_none,
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
#[derive(Deserialize, Serialize, Clone, Debug, Default)]
pub struct PurchaseOrderOmsFields {
    #[serde(default)]
    pub created_datetime: NaiveDateTime,
    #[serde(default)]
    pub confirmed_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub sent_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub supplier_discount_percentage: Option<f64>,
    #[serde(default)]
    pub request_approval_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub finalised_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    pub status: PurchaseOrderStatus,
}

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
    pub is_authorised: bool,
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
            order_total_after_discount: _, // Not used, we calculate from the sum of the lines instead
            is_authorised: _,
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

        let supplier_discount_percentage = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.supplier_discount_percentage)
            .or_else(|| {
                if order_total_before_discount > 0.0 {
                    Some(supplier_discount_amount / order_total_before_discount * 100.0)
                } else {
                    None
                }
            });

        let request_approval_datetime = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.request_approval_datetime);

        let finalised_datetime = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.finalised_datetime);

        let status = oms_fields
            .clone()
            .map(|oms_field| oms_field.status)
            .unwrap_or_else(|| from_legacy_status(&status, sent_datetime));

        let result = PurchaseOrderRow {
            id,
            created_by,
            purchase_order_number,
            store_id,
            supplier_name_id: name_id,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            donor_id: donor_id,
            reference,
            currency_id,
            foreign_exchange_rate: curr_rate.unwrap_or(1.0),
            shipping_method: delivery_method,
            sent_datetime,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
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
            request_approval_datetime,
            finalised_datetime,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(PurchaseOrderDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let purchase_order = PurchaseOrderRepository::new(connection)
            .query_by_filter(
                PurchaseOrderFilter::new()
                    .id(EqualFilter::equal_to(changelog.record_id.to_string())),
            )?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Purchase Order not found"))?;

        let PurchaseOrderRow {
            id,
            store_id,
            created_by,
            supplier_name_id: supplier_name_link_id,
            purchase_order_number,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            donor_id: donor_link_id,
            reference,
            currency_id,
            foreign_exchange_rate,
            shipping_method,
            sent_datetime,
            contract_signed_date,
            advance_paid_date,
            received_at_port_date,
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
            request_approval_datetime,
            finalised_datetime,
        } = purchase_order.purchase_order_row;

        let PurchaseOrderStatsRow {
            purchase_order_id: _,
            order_total_before_discount,
            order_total_after_discount,
        } = purchase_order.purchase_order_stats_row.unwrap_or_default();

        let oms_fields = PurchaseOrderOmsFields {
            created_datetime,
            confirmed_datetime,
            sent_datetime,
            supplier_discount_percentage,
            request_approval_datetime,
            finalised_datetime,
            status: status.clone(),
        };

        let donor_id = map_optional_name_link_id_to_name_id(connection, donor_link_id)?;
        let supplier_id = map_name_link_id_to_name_id(connection, supplier_name_link_id)?;

        let legacy_row = LegacyPurchaseOrderRow {
            id,
            purchase_order_number,
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
            supplier_discount_amount: if let Some(percentage) = supplier_discount_percentage {
                order_total_before_discount * (percentage / 100.0)
            } else {
                0.0
            },
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
            curr_rate: Some(foreign_exchange_rate),
            order_total_before_discount,
            order_total_after_discount,
            donor_id,
            is_authorised: check_is_authorised(&status),
            oms_fields: Some(oms_fields),
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

fn from_legacy_status(
    status: &LegacyPurchaseOrderStatus,
    sent_datetime: Option<NaiveDateTime>,
) -> PurchaseOrderStatus {
    match status {
        LegacyPurchaseOrderStatus::Nw => PurchaseOrderStatus::New,
        LegacyPurchaseOrderStatus::Sg => PurchaseOrderStatus::RequestApproval, // TODO: if authorisation not needed should be new?
        LegacyPurchaseOrderStatus::Cn => {
            if sent_datetime.is_some() {
                PurchaseOrderStatus::Sent
            } else {
                PurchaseOrderStatus::Confirmed
            }
        }
        LegacyPurchaseOrderStatus::Fn => PurchaseOrderStatus::Finalised, // authorised might or might not be true in this case...
        LegacyPurchaseOrderStatus::Others => PurchaseOrderStatus::New, // Default to New for others
    }
}

fn to_legacy_status(status: &PurchaseOrderStatus) -> LegacyPurchaseOrderStatus {
    match status {
        PurchaseOrderStatus::New => LegacyPurchaseOrderStatus::Nw,
        PurchaseOrderStatus::RequestApproval => LegacyPurchaseOrderStatus::Sg,
        PurchaseOrderStatus::Confirmed => LegacyPurchaseOrderStatus::Cn,
        PurchaseOrderStatus::Sent => LegacyPurchaseOrderStatus::Cn,
        PurchaseOrderStatus::Finalised => LegacyPurchaseOrderStatus::Fn,
    }
}

/*
Assuming Finalised is always authorised
the action might be skipped if authorisation is not required due to global preference.
N.B. if this logic changes, update the Purchase Order form's logic
(the 'AUTHORISED/UNAUTHORISED' watermark in this file: .../open-msupply/standard_forms/purchase-order/latest/src/template.html)
*/
fn check_is_authorised(status: &PurchaseOrderStatus) -> bool {
    matches!(
        status,
        PurchaseOrderStatus::Confirmed | PurchaseOrderStatus::Sent | PurchaseOrderStatus::Finalised
    )
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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
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
