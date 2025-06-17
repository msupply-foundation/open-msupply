use chrono::NaiveDateTime;
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderRow, PurchaseOrderStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::{
        date_and_time_to_datetime, date_from_date_time, date_option_to_isostring,
        date_to_isostring, empty_str_as_option, empty_str_as_option_string, zero_date_as_option,
    },
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
    #[serde(deserialize_with = "empty_str_as_option")]
    pub target_months: Option<f64>,
    pub status: LegacyPurchaseOrderStatus,
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
    #[serde(deserialize_with = "empty_str_as_option")]
    pub freight_conditions: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub additional_instructions: Option<String>,
    // pub total_foreign_currency_expected: String,
    // pub total_local_currency_expected: String,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub agent_commission: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub document_charge: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub communications_charge: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub insurance_charge: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub freight_charge: Option<f64>,
    // pub po_sent_date: String,
    pub supplier_discount_amount: Option<f64>,
    // pub Order_total_before_discount: String,
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
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PurchaseOrderTranslation)
}

pub(super) struct PurchaseOrderTranslation;

impl SyncTranslation for PurchaseOrderTranslation {
    fn table_name(&self) -> &str {
        "requisition"
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
        let json_data = serde_json::from_str::<serde_json::Value>(&sync_record.data)?;
        let data = serde_json::from_value::<LegacyPurchaseOrderRow>(json_data)?;

        let result = PurchaseOrderRow {
            id: data.id,
            user_id: data.user_id,
            purchase_order_number: data.purchase_order_number,
            store_id: data.store_id,
            supplier_name_link_id: data.supplier_name_link_id,
            status: from_legacy_status(&data.status),
            created_datetime: data.created_datetime,
            confirmed_datetime: data.confirmed_datetime,
            // no direct mapping from legacy
            delivered_datetime: None,
            target_months: data.target_months,
            comment: data.comment,
            // no direct mapping from legacy
            supplier_discount_percentage: data.supplier_discount_percentage,
            supplier_discount_amount: data.supplier_discount_amount,
            donor_link_id: data.donor_link_id,
            reference: data.reference,
            currency_id: data.currency_id,
            // no direct mapping from legacy
            foreign_exchange_rate: None,
            // no direct mapping from legacy
            shipping_method: None,
            // no direct mapping from legacy
            sent_datetime: None,
            // no direct mapping from legacy
            contract_signed_datetime: None,
            // no direct mapping from legacy
            advance_paid_datetime: None,
            // no direct mapping from legacy
            received_at_port_datetime: None,
            // no direct mapping from legacy
            expected_delivery_datetime: None,
            supplier_agent: data.supplier_agent,
            authorising_officer_1: data.authorising_officer_1,
            authorising_officer_2: data.authorising_officer_2,
            additional_instructions: data.additional_instructions,
            // no direct mapping from legacy
            heading_message: None,
            agent_commission: data.agent_commission,
            document_charge: data.document_charge,
            communications_charge: data.communications_charge,
            insurance_charge: data.insurance_charge,
            freight_charge: data.freight_charge,
            freight_conditions: data.freight_conditions,
        };
        Ok(PullTranslateResult::upsert(result))
    }

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
