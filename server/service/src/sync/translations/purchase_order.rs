use std::sync::LazyLock;

use crate::{
    purchase_order::update::PURCHASE_ORDER_CUSTOM_FIELD_SCOPE,
    sync::{
        CentralServerConfig,
        central_mapping_custom_fields::{keys, legacy_owned_keys_for_scopes},
        translations::{
            FkField, PullTranslateResult, PushTranslateResult, SyncTranslation,
            name::NameTranslation,
            store::StoreTranslation,
            utils::{LegacyCustomFieldsBuilder, custom_field_string, merge_legacy_custom_fields},
        },
    },
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderDelete, PurchaseOrderFilter,
    PurchaseOrderRepository, PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatsRow,
    PurchaseOrderStatus, Row, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, empty_str_as_option_string,
    object_fields_as_option, zero_date_as_option, zero_f64_as_none,
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
    pub cancelled_datetime: Option<NaiveDateTime>,
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
    /// Mapped to/from `custom_fields` — see [`LEGACY_PURCHASE_ORDER_OWNED_KEYS`]. Only central pushes them.
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_field_1: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_field_2: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_ID: Option<String>,
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
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
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
            freight_conditions,
            heading_message,
            user_field_1,
            user_field_2,
            category_ID,
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
        } = sync_record.deserialize()?;

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

        let supplier_discount_percentage = match oms_fields
            .clone()
            .and_then(|oms_field| oms_field.supplier_discount_percentage)
        {
            Some(percentage) => Some(percentage),
            // Service lines take no supplier discount: convert against the stock lines already here
            None => {
                let discountable_total = PurchaseOrderRepository::new(connection)
                    .query_by_filter(
                        PurchaseOrderFilter::new().id(EqualFilter::equal_to(id.clone())),
                    )?
                    .pop()
                    .and_then(|order| order.purchase_order_stats_row)
                    .map(|stats| stats.supplier_discountable_total)
                    .unwrap_or(order_total_before_discount);
                (discountable_total > 0.0)
                    .then(|| supplier_discount_amount / discountable_total * 100.0)
            }
        };

        let request_approval_datetime = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.request_approval_datetime);

        let finalised_datetime = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.finalised_datetime);

        let cancelled_datetime = oms_fields
            .clone()
            .and_then(|oms_field| oms_field.cancelled_datetime);

        let status = oms_fields
            .clone()
            .map(|oms_field| oms_field.status)
            .unwrap_or_else(|| from_legacy_status(&status, sent_datetime));

        let fk_check = fk_checker.with_table(connection, "purchase_order", &id);
        let check_fk = fk_checker.with_table_required(connection, "purchase_order", &id);

        let currency_id = fk_check(currency_id, "currency_id", FkField::Currency)?;

        // Only central maps the mSupply-owned keys; a remote keeps whatever it already has.
        let existing_custom_fields = PurchaseOrderRowRepository::new(connection)
            .find_one_by_id(&id)?
            .and_then(|row| row.custom_fields);
        let custom_fields = if CentralServerConfig::is_central_server() {
            merge_legacy_custom_fields(
                existing_custom_fields,
                LegacyCustomFieldsBuilder::new()
                    .option(keys::PURCHASE_ORDER_CATEGORY, category_ID.as_deref())
                    .text(keys::PURCHASE_ORDER_USER_FIELD_1, user_field_1.as_deref())
                    .text(keys::PURCHASE_ORDER_USER_FIELD_2, user_field_2.as_deref())
                    .build(),
                &LEGACY_PURCHASE_ORDER_OWNED_KEYS,
            )
        } else {
            existing_custom_fields
        };

        let result = PurchaseOrderRow {
            id,
            created_by,
            purchase_order_number,
            store_id: check_fk(store_id, "store_id", FkField::Store)?,
            supplier_name_id: check_fk(name_id, "supplier_name_link_id", FkField::NameLink)?,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            donor_id: fk_check(donor_id, "donor_link_id", FkField::NameLink)?,
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
            freight_conditions,
            request_approval_datetime,
            finalised_datetime,
            custom_fields,
            cancelled_datetime,
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
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::PurchaseOrder(purchase_order_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let purchase_order = PurchaseOrderRepository::new(connection)
            .query_by_filter(
                PurchaseOrderFilter::new().id(EqualFilter::equal_to(purchase_order_row.id)),
            )?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Purchase Order not found"))?;

        let PurchaseOrderRow {
            id,
            store_id,
            created_by,
            supplier_name_id,
            purchase_order_number,
            status,
            created_datetime,
            confirmed_datetime,
            target_months,
            comment,
            supplier_discount_percentage,
            donor_id,
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
            freight_conditions,
            request_approval_datetime,
            finalised_datetime,
            custom_fields,
            cancelled_datetime,
        } = purchase_order.purchase_order_row;

        let PurchaseOrderStatsRow {
            purchase_order_id: _,
            order_total_before_discount,
            order_total_after_discount,
            supplier_discountable_total,
        } = purchase_order.purchase_order_stats_row.unwrap_or_default();

        let oms_fields = PurchaseOrderOmsFields {
            created_datetime,
            confirmed_datetime,
            sent_datetime,
            supplier_discount_percentage,
            request_approval_datetime,
            finalised_datetime,
            cancelled_datetime,
            status: status.clone(),
        };

        // Off central these keys are never authored, so leave them out rather than wipe mSupply's values
        let is_central = CentralServerConfig::is_central_server();
        let legacy_field = |key: &str| {
            is_central.then(|| custom_field_string(&custom_fields, key).unwrap_or_default())
        };

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
            user_field_1: legacy_field(keys::PURCHASE_ORDER_USER_FIELD_1),
            user_field_2: legacy_field(keys::PURCHASE_ORDER_USER_FIELD_2),
            category_ID: legacy_field(keys::PURCHASE_ORDER_CATEGORY),
            supplier_discount_amount: if let Some(percentage) = supplier_discount_percentage {
                supplier_discountable_total * (percentage / 100.0)
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
            name_id: supplier_name_id,
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

/// The `custom_fields` keys the OG import owns for purchase orders.
static LEGACY_PURCHASE_ORDER_OWNED_KEYS: LazyLock<Vec<&'static str>> =
    LazyLock::new(|| legacy_owned_keys_for_scopes(&[PURCHASE_ORDER_CUSTOM_FIELD_SCOPE]));

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
        // Legacy has no cancelled status; the true state travels in om_fields
        PurchaseOrderStatus::Cancelled => LegacyPurchaseOrderStatus::Fn,
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
        PurchaseOrderStatus::Confirmed
            | PurchaseOrderStatus::Sent
            | PurchaseOrderStatus::Finalised
            | PurchaseOrderStatus::Cancelled
    )
}

#[cfg(test)]
mod tests {
    use crate::sync::translations::ToSyncRecordTranslationType;

    use super::*;
    use repository::{
        ChangelogCondition, ChangelogRepository, CursorAndLimit, FilterBuilder, RowOrDelete,
        mock::MockDataInserts, test_db::setup_all,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_purchase_order_translation() {
        use crate::sync::test::test_data::purchase_order as test_data;
        let translator = PurchaseOrderTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_purchase_order_translation",
            MockDataInserts::none().purchase_order().currencies(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
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
            MockDataInserts::none().purchase_order().currencies(),
        )
        .await;

        let translator = PurchaseOrderTranslation {};
        let entries = ChangelogRepository::new(&connection)
            .query_with_data(
                ChangelogCondition::table_name::equal(ChangelogTableName::PurchaseOrder),
                CursorAndLimit {
                    cursor: -1,
                    limit: 1_000_000,
                },
            )
            .unwrap();

        for entry in entries.rows {
            let RowOrDelete::Row { changelog, row } = entry else {
                panic!("expected upsert row")
            };
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog, row)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
        }
    }

    /// Only central pushes the legacy category and user fields; a cleared one goes as blank.
    #[actix_rt::test]
    async fn test_purchase_order_user_fields_push_from_central_only() {
        use crate::sync::test_util_set_is_central_server;
        use repository::mock::mock_purchase_order_a;

        let translator = PurchaseOrderTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_user_fields_push_from_central_only",
            MockDataInserts::none().purchase_order().currencies(),
        )
        .await;

        let repo = PurchaseOrderRowRepository::new(&connection);
        let mut order = repo
            .find_one_by_id(&mock_purchase_order_a().id)
            .unwrap()
            .unwrap();
        order.custom_fields = Some(json!({ "purchase_order_user_field_1": "Grant 42" }));
        repo.upsert_one(&order).unwrap();

        let pushed = || {
            let changelog = ChangelogRow {
                record_id: order.id.clone(),
                table_name: ChangelogTableName::PurchaseOrder,
                ..Default::default()
            };
            let row = Row::PurchaseOrder(order.clone());
            let PushTranslateResult::PushRecord(translated) = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog, row)
                .unwrap()
            else {
                panic!("should translate")
            };
            translated[0].record.record_data.clone()
        };

        test_util_set_is_central_server(true);
        let from_central = pushed();
        test_util_set_is_central_server(false);
        assert_eq!(from_central["user_field_1"], json!("Grant 42"));
        assert_eq!(from_central["user_field_2"], json!(""));
        assert_eq!(from_central["category_ID"], json!(""));

        let from_remote = pushed();
        for field in ["user_field_1", "user_field_2", "category_ID"] {
            assert!(from_remote.get(field).is_none(), "{field} left out");
        }
    }

    /// Central maps the legacy category and user fields into custom_fields.
    #[actix_rt::test]
    async fn test_purchase_order_user_fields_map_to_custom_fields() {
        use crate::sync::{
            test::test_data::purchase_order as test_data, test_util_set_is_central_server,
            translations::IntegrationOperation,
        };
        use repository::mock::mock_purchase_order_a;
        use util::assert_variant;

        let translator = PurchaseOrderTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_user_fields_map_to_custom_fields",
            MockDataInserts::none().purchase_order().currencies(),
        )
        .await;

        let repo = PurchaseOrderRowRepository::new(&connection);
        let mut existing = repo
            .find_one_by_id(&mock_purchase_order_a().id)
            .unwrap()
            .unwrap();
        existing.custom_fields = Some(json!({
            "oms_authored": "keep",
            "purchase_order_user_field_2": "cleared on OG",
        }));
        repo.upsert_one(&existing).unwrap();

        let mut record = test_data::test_pull_upsert_records()[0]
            .sync_buffer_row
            .clone();
        record.record_id = existing.id.clone();
        record.data.0["ID"] = json!(existing.id);
        record.data.0["user_field_1"] = json!("Grant 42");
        record.data.0["user_field_2"] = json!("");
        record.data.0["category_ID"] = json!("PO_CAT_1");

        let custom_fields = || {
            let mut operations = assert_variant!(
                translator.try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record,
                ),
                Ok(PullTranslateResult::IntegrationOperations(out)) => out
            );
            let mut upsert = assert_variant!(
                operations.pop(),
                Some(IntegrationOperation::Upsert(out)) => out
            );
            upsert
                .as_mut_any()
                .and_then(|any| any.downcast_mut::<PurchaseOrderRow>())
                .unwrap()
                .custom_fields
                .clone()
        };

        test_util_set_is_central_server(true);
        let on_central = custom_fields();
        test_util_set_is_central_server(false);
        assert_eq!(
            on_central,
            Some(json!({
                "oms_authored": "keep",
                "purchase_order_user_field_1": "Grant 42",
                "purchase_order_category": "PO_CAT_1",
            }))
        );

        assert_eq!(
            custom_fields(),
            Some(json!({
                "oms_authored": "keep",
                "purchase_order_user_field_2": "cleared on OG",
            }))
        );

        let stored = Some(json!({
            "purchase_order_user_field_1": "Grant 42",
            "purchase_order_category": "PO_CAT_1",
        }));
        assert_eq!(
            custom_field_string(&stored, keys::PURCHASE_ORDER_CATEGORY),
            Some("PO_CAT_1".to_string())
        );
        assert_eq!(
            custom_field_string(&stored, keys::PURCHASE_ORDER_USER_FIELD_1),
            Some("Grant 42".to_string())
        );
        assert_eq!(
            custom_field_string(&stored, keys::PURCHASE_ORDER_USER_FIELD_2),
            None
        );
    }

    /// mSupply's discount amount is converted against the stock lines alone.
    #[actix_rt::test]
    async fn test_purchase_order_discount_amount_ignores_service_lines() {
        use crate::sync::{
            test::test_data::purchase_order as test_data, translations::IntegrationOperation,
        };
        use repository::{
            PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
            mock::{mock_item_a, mock_item_service_item, mock_purchase_order_a},
        };
        use util::assert_variant;

        let translator = PurchaseOrderTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_purchase_order_discount_amount_ignores_service_lines",
            MockDataInserts::all(),
        )
        .await;

        let order = PurchaseOrderRow {
            id: "og_discount_po".to_string(),
            purchase_order_number: 98765,
            ..mock_purchase_order_a()
        };
        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&order)
            .unwrap();
        // 60.00 of stock and 25.00 of freight
        for (id, item_id, line_total) in [
            ("og_discount_stock", mock_item_a().id, 60.0),
            ("og_discount_freight", mock_item_service_item().id, 25.0),
        ] {
            PurchaseOrderLineRowRepository::new(&connection)
                .upsert_one(&PurchaseOrderLineRow {
                    id: id.to_string(),
                    purchase_order_id: order.id.clone(),
                    store_id: order.store_id.clone(),
                    item_id,
                    line_total,
                    ..Default::default()
                })
                .unwrap();
        }

        // An mSupply record with no OMS fields: 12.00 off an 85.00 order
        let mut record = test_data::test_pull_upsert_records()[0]
            .sync_buffer_row
            .clone();
        record.record_id = order.id.clone();
        record.data.0["ID"] = json!(order.id);
        record.data.0["oms_fields"] = json!("");
        record.data.0["Order_total_before_discount"] = json!(85.0);
        record.data.0["supplier_discount_amount"] = json!(12.0);

        let mut operations = assert_variant!(
            translator.try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &record,
            ),
            Ok(PullTranslateResult::IntegrationOperations(out)) => out
        );
        let mut upsert = assert_variant!(
            operations.pop(),
            Some(IntegrationOperation::Upsert(out)) => out
        );
        let row = upsert
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<PurchaseOrderRow>())
            .unwrap()
            .clone();

        // 12.00 of the 60.00 of stock is 20%, not 12.00 of 85.00
        assert_eq!(row.supplier_discount_percentage, Some(20.0));
    }
}
