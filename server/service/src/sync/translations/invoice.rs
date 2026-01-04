use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};
use crate::sync::translations::{
    clinician::ClinicianTranslation, currency::CurrencyTranslation,
    diagnosis::DiagnosisTranslation, name::NameTranslation,
    name_insurance_join::NameInsuranceJoinTranslation, store::StoreTranslation, to_legacy_time,
};
use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, CurrencyFilter, CurrencyRepository, EqualFilter, Invoice,
    InvoiceFilter, InvoiceRepository, InvoiceRow, InvoiceRowDelete, InvoiceRowRepository,
    InvoiceStatus, InvoiceType, KeyValueStoreRepository, NameRow, NameRowRepository,
    StorageConnection, StoreFilter, StoreRepository, StoreRowRepository, SyncBufferRow,
    UserAccountRow, UserAccountRowRepository,
};
use serde::{Deserialize, Serialize};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;
use util::sync_serde::{
    date_option_to_isostring, date_to_isostring, empty_str_as_option, empty_str_as_option_string,
    naive_time, zero_date_as_option, zero_f64_as_none,
};

#[derive(Deserialize, Serialize, Debug, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LegacyOmStatus {
    New,
    Allocated,
    Picked,
    Shipped,
    DeliveredNoStock,
    Delivered,
    Verified,
    Cancelled,
}

// Mapping between invoice row  status and legacy OmStatus

impl LegacyOmStatus {
    pub fn from_invoice_status(status: &InvoiceStatus) -> Self {
        match status {
            InvoiceStatus::New => LegacyOmStatus::New,
            InvoiceStatus::Allocated => LegacyOmStatus::Allocated,
            InvoiceStatus::Picked => LegacyOmStatus::Picked,
            InvoiceStatus::Shipped => LegacyOmStatus::Shipped,
            InvoiceStatus::Delivered => LegacyOmStatus::DeliveredNoStock, // Delivered used to include stock validation but it now doesn't
            InvoiceStatus::Received => LegacyOmStatus::Delivered, // Delivered was re-named to received in 2.8.3, but kept the translation as Delivered for backwards compatibility
            InvoiceStatus::Verified => LegacyOmStatus::Verified,
            InvoiceStatus::Cancelled => LegacyOmStatus::Cancelled,
        }
    }
    pub fn to_invoice_status(&self) -> InvoiceStatus {
        match self {
            LegacyOmStatus::New => InvoiceStatus::New,
            LegacyOmStatus::Allocated => InvoiceStatus::Allocated,
            LegacyOmStatus::Picked => InvoiceStatus::Picked,
            LegacyOmStatus::Shipped => InvoiceStatus::Shipped,
            LegacyOmStatus::DeliveredNoStock => InvoiceStatus::Delivered, // Delivered used to include stock validation but it now doesn't
            LegacyOmStatus::Delivered => InvoiceStatus::Received, // Delivered was re-named to received in 2.8.3, but kept the translation as Delivered for backwards compatibility
            LegacyOmStatus::Verified => InvoiceStatus::Verified,
            LegacyOmStatus::Cancelled => InvoiceStatus::Cancelled,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyTransactType {
    /// Supplier invoice
    #[serde(rename = "si")]
    Si,
    /// Customer invoice
    #[serde(rename = "ci")]
    Ci,
    /// Supplier credit
    #[serde(rename = "sc")]
    #[serde(alias = "Sc")]
    Sc,
    /// Repack
    #[serde(rename = "sr")]
    Sr,
    // Customer Credit
    #[serde(rename = "cc")]
    Cc,
    /// Bucket to catch all other variants
    /// E.g. "bu" (build),
    /// "rc" (cash receipt), "ps" (cash payment)
    #[serde(other)]
    Others,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyTransactStatus {
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
    /// E.g. "wp" (web processed), "wp" (web finalised),
    #[serde(other)]
    Others,
}

#[derive(Deserialize, Serialize, PartialEq, Eq, Clone, Debug)]
pub enum TransactMode {
    #[serde(rename = "store")]
    Store,
    #[serde(rename = "dispensary")]
    Dispensary,
    /// Bucket to catch all other variants
    #[serde(other)]
    Others,
}
#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTransactRow {
    pub ID: String,

    pub name_ID: String,
    pub store_ID: String,
    pub invoice_num: i64,
    #[serde(rename = "type")]
    pub _type: LegacyTransactType,
    pub status: LegacyTransactStatus,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "user_ID")]
    pub user_id: Option<String>,
    pub hold: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub their_ref: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "prescriber_ID")]
    pub clinician_id: Option<String>,
    #[serde(rename = "currency_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub currency_id: Option<String>,
    pub currency_rate: f64,
    #[serde(default)]
    #[serde(rename = "om_transport_reference")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub transport_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub goods_received_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub requisition_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub linked_transaction_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "nameInsuranceJoinID")]
    pub name_insurance_join_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "donor_default_id")]
    pub default_donor_id: Option<String>,
    #[serde(deserialize_with = "zero_f64_as_none")]
    #[serde(rename = "insuranceDiscountAmount")]
    pub insurance_discount_amount: Option<f64>,
    #[serde(deserialize_with = "zero_f64_as_none")]
    #[serde(rename = "insuranceDiscountRate")]
    pub insurance_discount_percentage: Option<f64>,

    /// creation time
    #[serde(serialize_with = "date_to_isostring")]
    pub entry_date: NaiveDate, // e.g. "2021-07-30",
    /// time in seconds
    #[serde(deserialize_with = "naive_time")]
    pub entry_time: NaiveTime, // e.g. 47046,
    /// delivered_datetime / picked_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub confirm_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub confirm_time: NaiveTime,

    /// verified_datetime / shipped_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub finalised_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub finalised_time: NaiveTime,

    pub mode: TransactMode,
    #[serde(rename = "tax_rate")]
    pub tax_percentage: Option<f64>,

    #[serde(default)]
    #[serde(rename = "om_created_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_allocated_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub allocated_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_picked_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub picked_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_shipped_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub shipped_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_delivered_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub delivered_datetime: Option<NaiveDateTime>,

    // To be added when available in mSupply
    // #[serde(default)]
    // #[serde(rename = "om_received_datetime")]
    // #[serde(deserialize_with = "empty_str_as_option")]
    // pub received_datetime: Option<NaiveDateTime>,
    #[serde(default)]
    #[serde(rename = "om_verified_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub verified_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_cancelled_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub cancelled_datetime: Option<NaiveDateTime>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_status: Option<LegacyOmStatus>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_type: Option<InvoiceType>,

    /// We ignore the legacy colour field
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub om_colour: Option<String>,

    #[serde(default)]
    #[serde(rename = "om_original_shipment_id")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub original_shipment_id: Option<String>,

    #[serde(default)]
    #[serde(rename = "om_backdated_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub backdated_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "diagnosis_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub diagnosis_id: Option<String>,

    #[serde(default)]
    #[serde(rename = "programID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub program_id: Option<String>,

    #[serde(default)]
    pub is_cancellation: bool,

    #[serde(default)]
    #[serde(rename = "arrival_date_estimated")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expected_delivery_date: Option<NaiveDate>,
}

/// The mSupply central server will map outbound invoices from omSupply to "si" invoices for the
/// receiving store. Same for Customer Returns.
/// In the current version of mSupply all om_ fields get copied though.
/// When receiving the transferred invoice on the omSupply store the "si" get translated to
/// outbound shipments because the om_type will override to legacy type field.
/// In other word, the inbound shipment will have an outbound type!
/// This function detect this case and removes all om_* fields from the incoming record.
fn sanitize_legacy_record(mut data: serde_json::Value) -> serde_json::Value {
    let Some(Ok(om_type)) = data
        .get("om_type")
        .map(|value| serde_json::from_value::<InvoiceType>(value.clone()))
    else {
        return data;
    };
    let Some(Ok(legacy_type)) = data
        .get("type")
        .map(|value| serde_json::from_value::<LegacyTransactType>(value.clone()))
    else {
        return data;
    };
    if legacy_type == LegacyTransactType::Si && om_type == InvoiceType::OutboundShipment {
        let Some(obj) = data.as_object_mut() else {
            return data;
        };
        obj.retain(|key, _| !key.starts_with("om_"));
    }
    if legacy_type == LegacyTransactType::Cc && om_type == InvoiceType::SupplierReturn {
        let Some(obj) = data.as_object_mut() else {
            return data;
        };
        obj.retain(|key, _| !key.starts_with("om_"));
    }

    data
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(InvoiceTranslation)
}
pub(crate) struct InvoiceTranslation;
impl SyncTranslation for InvoiceTranslation {
    fn table_name(&self) -> &str {
        "transact"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            ClinicianTranslation.table_name(),
            CurrencyTranslation.table_name(),
            DiagnosisTranslation.table_name(),
            NameInsuranceJoinTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Invoice)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<serde_json::Value>(&sync_record.data)?;
        let data = sanitize_legacy_record(data);
        let data = serde_json::from_value::<LegacyTransactRow>(data)?;
        // For owner records, only integrate if it's an insert operation, to happen only during initialisation,
        // or when a store is added to a site
        check_owned_invoice_update(connection, &data)?;

        let name = NameRowRepository::new(connection)
            .find_one_by_id(&data.name_ID)?
            .ok_or(anyhow::Error::msg(format!(
                "Missing name: {}",
                data.name_ID
            )))?;

        let name_store_id = StoreRepository::new(connection)
            .query_by_filter(
                StoreFilter::new().name_id(EqualFilter::equal_to(data.name_ID.to_owned())),
            )?
            .pop()
            .map(|store| store.store_row.id);

        let is_transfer = name_store_id.is_some();

        let invoice_type = match invoice_type(&data, &name) {
            Some(invoice_type) => invoice_type,
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "Unsupported invoice type {:?}",
                    data._type
                )))
            }
        };
        let invoice_status = match invoice_status(&invoice_type, &data, is_transfer) {
            Some(invoice_status) => invoice_status,
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "Unsupported invoice status {:?} (type: {:?}",
                    data.status, data._type
                )))
            }
        };

        let mapping = map_legacy(&invoice_type, &data, is_transfer);

        let currency_id = match data.currency_id {
            Some(currency_id) => Some(currency_id),
            None => {
                let currency_id = CurrencyRepository::new(connection)
                    .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
                    .pop()
                    .ok_or(anyhow::Error::msg("Home currency not found"))?
                    .currency_row
                    .id;
                Some(currency_id)
            }
        };

        let status = match data.om_status {
            Some(legacy_om_status) => legacy_om_status.to_invoice_status(),
            None => invoice_status,
        };

        let result = InvoiceRow {
            id: data.ID,
            user_id: data.user_id,
            store_id: data.store_ID,
            name_link_id: data.name_ID,
            name_store_id,
            invoice_number: data.invoice_num,
            r#type: data.om_type.unwrap_or(invoice_type),
            status,
            on_hold: data.hold,
            comment: data.comment,
            their_reference: data.their_ref,
            tax_percentage: data.tax_percentage,
            currency_id,
            currency_rate: data.currency_rate,
            clinician_link_id: data.clinician_id,

            // new om field mappings
            created_datetime: mapping.created_datetime,
            allocated_datetime: mapping.allocated_datetime,
            picked_datetime: mapping.picked_datetime,
            shipped_datetime: mapping.shipped_datetime,
            received_datetime: mapping.received_datetime,
            delivered_datetime: mapping.delivered_datetime,
            verified_datetime: mapping.verified_datetime,
            // Cancelled datetime handled in processor (To-DO)
            cancelled_datetime: data.cancelled_datetime,
            is_cancellation: data.is_cancellation,
            colour: mapping.colour,

            requisition_id: data.requisition_ID,
            linked_invoice_id: data.linked_transaction_id,
            default_donor_link_id: data.default_donor_id,
            transport_reference: data.transport_reference,
            original_shipment_id: data.original_shipment_id,
            backdated_datetime: mapping.backdated_datetime,
            diagnosis_id: data.diagnosis_id,
            program_id: data.program_id,
            name_insurance_join_id: data.name_insurance_join_id,
            insurance_discount_amount: data.insurance_discount_amount,
            insurance_discount_percentage: data.insurance_discount_percentage,
            expected_delivery_date: data.expected_delivery_date,
            goods_received_id: data.goods_received_ID,
        };

        // HACK...
        // Inactive user aren't always synced from mSupply
        // To avoid referential issues we'll create a blank placeholder user
        // If the user is synced later the record will be updated to the correct data
        if let Some(user_id) = &result.user_id {
            if UserAccountRowRepository::new(connection)
                .find_one_by_id(user_id)?
                .is_none()
            {
                UserAccountRowRepository::new(connection).insert_one(&UserAccountRow {
                    id: user_id.clone(),
                    ..Default::default()
                })?;
            }
        }

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        Ok(PullTranslateResult::delete(InvoiceRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(invoice) = InvoiceRepository::new(connection)
            .query_by_filter(
                InvoiceFilter::new().id(EqualFilter::equal_to(changelog.record_id.to_string())),
            )?
            .pop()
        else {
            return Err(anyhow::anyhow!("Invoice not found"));
        };

        let legacy_datetimes = to_legacy_datetime(&invoice.invoice_row);

        let Invoice {
            invoice_row:
                InvoiceRow {
                    id,
                    user_id,
                    name_link_id: _,
                    name_store_id: _,
                    store_id,
                    invoice_number,
                    r#type,
                    status,
                    on_hold,
                    comment,
                    their_reference,
                    created_datetime,
                    allocated_datetime,
                    picked_datetime,
                    shipped_datetime,
                    received_datetime,
                    delivered_datetime,
                    verified_datetime,
                    cancelled_datetime,
                    colour,
                    requisition_id,
                    linked_invoice_id,
                    transport_reference,
                    tax_percentage,
                    clinician_link_id: _,
                    currency_id,
                    currency_rate,
                    original_shipment_id,
                    backdated_datetime,
                    diagnosis_id,
                    program_id,
                    name_insurance_join_id,
                    insurance_discount_amount,
                    insurance_discount_percentage,
                    is_cancellation,
                    expected_delivery_date,
                    default_donor_link_id: default_donor_id,
                    goods_received_id,
                },
            name_row,
            clinician_row,
            ..
        } = invoice;

        let _type = match legacy_invoice_type(&r#type) {
            Some(_type) => _type,
            None => {
                return Ok(PushTranslateResult::Ignored(format!(
                    "Unsupported invoice type {type:?}"
                )))
            }
        };

        let legacy_status = match legacy_invoice_status(&r#type, &status) {
            Some(legacy_status) => legacy_status,
            None => {
                return Ok(PushTranslateResult::Ignored(format!(
                    "Unsupported invoice status: {status:?}"
                )))
            }
        };

        let legacy_row = LegacyTransactRow {
            ID: id.clone(),
            user_id,
            name_ID: name_row.id,
            store_ID: store_id,
            invoice_num: invoice_number,
            _type,
            status: legacy_status,
            hold: on_hold,
            comment,
            their_ref: their_reference,
            requisition_ID: requisition_id,
            linked_transaction_id: linked_invoice_id,
            entry_date: created_datetime.date(),
            entry_time: to_legacy_time(created_datetime),
            confirm_date: legacy_datetimes.confirm_datetime.0,
            confirm_time: legacy_datetimes.confirm_datetime.1,
            finalised_date: legacy_datetimes.finalised_datetime.0,
            finalised_time: legacy_datetimes.finalised_datetime.1,
            tax_percentage,
            mode: if r#type == InvoiceType::Prescription {
                TransactMode::Dispensary
            } else {
                TransactMode::Store
            },
            transport_reference,
            created_datetime: Some(created_datetime),
            allocated_datetime,
            picked_datetime,
            shipped_datetime,
            delivered_datetime: received_datetime.or(delivered_datetime), // If we have a received_datetime, this is what we use as delivered in mSupply until field is added TODO
            verified_datetime,
            cancelled_datetime,
            om_status: Some(LegacyOmStatus::from_invoice_status(&status)),
            om_type: Some(r#type),
            om_colour: colour,
            currency_id,
            currency_rate,
            clinician_id: clinician_row.map(|row| row.id),
            original_shipment_id,
            backdated_datetime,
            diagnosis_id,
            program_id,
            name_insurance_join_id,
            insurance_discount_amount,
            insurance_discount_percentage,
            is_cancellation,
            expected_delivery_date,
            default_donor_id,
            goods_received_ID: goods_received_id,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            json_record,
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

fn invoice_type(data: &LegacyTransactRow, name: &NameRow) -> Option<InvoiceType> {
    if name.code == INVENTORY_ADJUSTMENT_NAME_CODE {
        return match data._type {
            LegacyTransactType::Si => Some(InvoiceType::InventoryAddition),
            LegacyTransactType::Sc => Some(InvoiceType::InventoryReduction),
            _ => return None,
        };
    }
    if data.mode == TransactMode::Dispensary {
        return match data._type {
            LegacyTransactType::Ci => Some(InvoiceType::Prescription),
            _ => return None,
        };
    }
    match data._type {
        LegacyTransactType::Si => Some(InvoiceType::InboundShipment),
        LegacyTransactType::Ci => Some(InvoiceType::OutboundShipment),
        LegacyTransactType::Sr => Some(InvoiceType::Repack),
        LegacyTransactType::Cc => Some(InvoiceType::CustomerReturn),
        LegacyTransactType::Sc => Some(InvoiceType::SupplierReturn),
        _ => None,
    }
}

fn map_backdated_datetime(
    created_datetime: &NaiveDateTime,
    picked_datetime: &Option<NaiveDateTime>,
) -> Option<NaiveDateTime> {
    match picked_datetime {
        Some(picked_datetime) => {
            if picked_datetime < created_datetime {
                return Some(picked_datetime.to_owned()); // Picked date was before created_datetime assume it must be backdated
            }
            None
        }
        None => None, // No picked time, means it can't be backdated
    }
}

/// Helper struct for new om_* fields mappings
struct LegacyMapping {
    created_datetime: NaiveDateTime,
    picked_datetime: Option<NaiveDateTime>,
    delivered_datetime: Option<NaiveDateTime>,
    received_datetime: Option<NaiveDateTime>,
    allocated_datetime: Option<NaiveDateTime>,
    shipped_datetime: Option<NaiveDateTime>,
    verified_datetime: Option<NaiveDateTime>,
    backdated_datetime: Option<NaiveDateTime>,
    colour: Option<String>,
}
/// Either make use of om_* fields, if present, or do a best afford mapping
fn map_legacy(
    invoice_type: &InvoiceType,
    data: &LegacyTransactRow,
    is_transfer: bool,
) -> LegacyMapping {
    // If created_datetime (om_created_datetime) exists then the record was created in omSupply and
    // omSupply fields are used

    if let Some(created_datetime) = data.created_datetime {
        let received_datetime = match data.om_status {
            Some(LegacyOmStatus::DeliveredNoStock) => None, // DeliveredNoStock status means we haven't updated stock and therefore haven't got a received_datetime
            Some(LegacyOmStatus::Delivered) | Some(LegacyOmStatus::Verified) => {
                data.delivered_datetime
            }
            _ => data.delivered_datetime,
        };
        return LegacyMapping {
            created_datetime,
            picked_datetime: data.picked_datetime,
            received_datetime,
            delivered_datetime: data.delivered_datetime,
            allocated_datetime: data.allocated_datetime,
            shipped_datetime: data.shipped_datetime,
            verified_datetime: data.verified_datetime,
            backdated_datetime: data.backdated_datetime.or(map_backdated_datetime(
                &created_datetime,
                &data.picked_datetime,
            )),
            colour: data.om_colour.clone(),
        };
    }

    // Mapping legacy fields to om_fields
    let mut mapping = LegacyMapping {
        created_datetime: NaiveDateTime::new(data.entry_date, data.entry_time),
        picked_datetime: None,
        delivered_datetime: None,
        allocated_datetime: None,
        shipped_datetime: None,
        verified_datetime: None,
        backdated_datetime: None,
        colour: None,
        received_datetime: None,
    };

    let confirm_datetime = data
        .confirm_date
        .map(|confirm_date| NaiveDateTime::new(confirm_date, data.confirm_time));

    let finalised_datetime = data
        .finalised_date
        .map(|finalised_date| NaiveDateTime::new(finalised_date, data.finalised_time))
        .or(confirm_datetime);

    // Try to figure out if a legacy record was backdated
    let backdated_datetime = map_backdated_datetime(&mapping.created_datetime, &confirm_datetime);
    if backdated_datetime.is_some() {
        mapping.backdated_datetime = backdated_datetime
    }

    match invoice_type {
        InvoiceType::OutboundShipment | InvoiceType::SupplierReturn => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.allocated_datetime = confirm_datetime;
                mapping.picked_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.allocated_datetime = confirm_datetime;
                mapping.picked_datetime = confirm_datetime;
                mapping.shipped_datetime = finalised_datetime;
            }
            _ => {}
        },
        InvoiceType::InboundShipment | InvoiceType::CustomerReturn => match data.status {
            LegacyTransactStatus::Nw if is_transfer => {
                mapping.shipped_datetime = Some(mapping.created_datetime);
            }
            LegacyTransactStatus::Cn => {
                mapping.received_datetime = confirm_datetime;
                mapping.delivered_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.received_datetime = confirm_datetime;
                mapping.delivered_datetime = confirm_datetime;
                mapping.verified_datetime = finalised_datetime;
            }
            _ => {}
        },
        InvoiceType::Prescription => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.picked_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.picked_datetime = confirm_datetime;
                mapping.verified_datetime = finalised_datetime;
            }
            _ => {}
        },
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.verified_datetime = finalised_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.verified_datetime = finalised_datetime;
            }
            _ => {}
        },
        InvoiceType::Repack => {
            if let LegacyTransactStatus::Fn = data.status {
                mapping.verified_datetime = finalised_datetime;
            }
        }
    };
    mapping
}

struct ToLegacyDatetime {
    confirm_datetime: (Option<NaiveDate>, NaiveTime),
    finalised_datetime: (Option<NaiveDate>, NaiveTime),
}

fn to_legacy_datetime(
    InvoiceRow {
        r#type,
        picked_datetime,
        received_datetime: delivered_datetime,
        verified_datetime,
        shipped_datetime,
        ..
    }: &InvoiceRow,
) -> ToLegacyDatetime {
    let confirm_datetime = match r#type {
        InvoiceType::OutboundShipment => picked_datetime,
        InvoiceType::InboundShipment => delivered_datetime,
        InvoiceType::Prescription => picked_datetime,
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction | InvoiceType::Repack => {
            verified_datetime
        }
        // TODO confirm
        InvoiceType::CustomerReturn => delivered_datetime,
        InvoiceType::SupplierReturn => picked_datetime,
    };

    let finalised_datetime = match r#type {
        InvoiceType::OutboundShipment | InvoiceType::Prescription | InvoiceType::SupplierReturn => {
            shipped_datetime
        }
        InvoiceType::InboundShipment
        | InvoiceType::InventoryAddition
        | InvoiceType::InventoryReduction
        | InvoiceType::Repack
        | InvoiceType::CustomerReturn => verified_datetime,
    };

    let confirm_date = confirm_datetime.map(|datetime| datetime.date());
    let confirm_time = confirm_datetime
        .map(to_legacy_time)
        .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap());

    let finalised_date = finalised_datetime.map(|datetime| datetime.date());
    let finalised_time = finalised_datetime
        .map(to_legacy_time)
        .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap());

    ToLegacyDatetime {
        confirm_datetime: (confirm_date, confirm_time),
        finalised_datetime: (finalised_date, finalised_time),
    }
}

fn invoice_status(
    invoice_type: &InvoiceType,
    data: &LegacyTransactRow,
    is_transfer: bool,
) -> Option<InvoiceStatus> {
    let status = match invoice_type {
        // prescription
        InvoiceType::Prescription => match data.status {
            LegacyTransactStatus::Nw => InvoiceStatus::New,
            LegacyTransactStatus::Sg => InvoiceStatus::New,
            LegacyTransactStatus::Cn => InvoiceStatus::Picked,
            LegacyTransactStatus::Fn => InvoiceStatus::Verified,
            _ => return None,
        },
        // outbound
        InvoiceType::OutboundShipment | InvoiceType::SupplierReturn => match data.status {
            LegacyTransactStatus::Nw => InvoiceStatus::New,
            LegacyTransactStatus::Sg => InvoiceStatus::New,
            LegacyTransactStatus::Cn => InvoiceStatus::Picked,
            LegacyTransactStatus::Fn => InvoiceStatus::Shipped,
            _ => return None,
        },
        // inbound
        InvoiceType::InboundShipment | InvoiceType::CustomerReturn => match data.status {
            // sg status is only for manually created supplier invoice in OG
            LegacyTransactStatus::Sg => InvoiceStatus::New,
            // Transferred new invoices, when migrated from mSupply should be converted to shipped status
            LegacyTransactStatus::Nw if is_transfer => InvoiceStatus::Shipped,
            LegacyTransactStatus::Nw if !is_transfer => InvoiceStatus::New,
            LegacyTransactStatus::Cn => InvoiceStatus::Received,
            LegacyTransactStatus::Fn => InvoiceStatus::Verified,
            _ => return None,
        },
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction => match data.status {
            LegacyTransactStatus::Nw => InvoiceStatus::New,
            LegacyTransactStatus::Sg => InvoiceStatus::New,
            LegacyTransactStatus::Cn => InvoiceStatus::Verified,
            LegacyTransactStatus::Fn => InvoiceStatus::Verified,
            _ => return None,
        },
        // mSupply will delete any unfinalised repacks before migration
        InvoiceType::Repack => match data.status {
            LegacyTransactStatus::Fn => InvoiceStatus::Verified,
            _ => return None,
        },
    };
    Some(status)
}

fn legacy_invoice_type(_type: &InvoiceType) -> Option<LegacyTransactType> {
    let t = match _type {
        InvoiceType::OutboundShipment => LegacyTransactType::Ci,
        InvoiceType::InboundShipment => LegacyTransactType::Si,
        // prescription
        InvoiceType::Prescription => LegacyTransactType::Ci,
        // Inventory Adjustment
        InvoiceType::InventoryAddition => LegacyTransactType::Si,
        InvoiceType::InventoryReduction => LegacyTransactType::Sc,
        InvoiceType::Repack => LegacyTransactType::Sr,
        InvoiceType::CustomerReturn => LegacyTransactType::Cc,
        InvoiceType::SupplierReturn => LegacyTransactType::Sc,
    };
    Some(t)
}

fn legacy_invoice_status(t: &InvoiceType, status: &InvoiceStatus) -> Option<LegacyTransactStatus> {
    // TODO: Should we return none if it's an invalid status? E.g. Shipped for a Prescription?
    let status = match t {
        InvoiceType::OutboundShipment | InvoiceType::SupplierReturn => match status {
            InvoiceStatus::New => LegacyTransactStatus::Sg,
            InvoiceStatus::Allocated => LegacyTransactStatus::Sg,
            InvoiceStatus::Picked => LegacyTransactStatus::Cn,
            InvoiceStatus::Shipped => LegacyTransactStatus::Fn,
            InvoiceStatus::Delivered => LegacyTransactStatus::Fn,
            InvoiceStatus::Received => LegacyTransactStatus::Fn,
            InvoiceStatus::Verified => LegacyTransactStatus::Fn,
            InvoiceStatus::Cancelled => LegacyTransactStatus::Fn,
        },
        InvoiceType::InboundShipment | InvoiceType::CustomerReturn => match status {
            InvoiceStatus::New => LegacyTransactStatus::Nw,
            InvoiceStatus::Allocated => LegacyTransactStatus::Nw,
            InvoiceStatus::Picked => LegacyTransactStatus::Nw,
            InvoiceStatus::Shipped => LegacyTransactStatus::Nw,
            InvoiceStatus::Delivered => LegacyTransactStatus::Nw,
            InvoiceStatus::Received => LegacyTransactStatus::Cn,
            InvoiceStatus::Verified => LegacyTransactStatus::Fn,
            InvoiceStatus::Cancelled => LegacyTransactStatus::Fn,
        },
        InvoiceType::Prescription => match status {
            InvoiceStatus::New => LegacyTransactStatus::Nw,
            InvoiceStatus::Allocated => LegacyTransactStatus::Cn,
            InvoiceStatus::Picked => LegacyTransactStatus::Cn,
            InvoiceStatus::Shipped => LegacyTransactStatus::Fn,
            InvoiceStatus::Delivered => LegacyTransactStatus::Sg,
            InvoiceStatus::Received => LegacyTransactStatus::Fn,
            InvoiceStatus::Verified => LegacyTransactStatus::Fn,
            InvoiceStatus::Cancelled => LegacyTransactStatus::Fn, // TODO enable cancelled status to sync with mSupply https://github.com/msupply-foundation/open-msupply/issues/6495
        },
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction | InvoiceType::Repack => {
            match status {
                InvoiceStatus::New => LegacyTransactStatus::Nw,
                InvoiceStatus::Allocated => LegacyTransactStatus::Nw,
                InvoiceStatus::Picked => LegacyTransactStatus::Nw,
                InvoiceStatus::Shipped => LegacyTransactStatus::Nw,
                InvoiceStatus::Delivered => LegacyTransactStatus::Nw,
                InvoiceStatus::Received => LegacyTransactStatus::Nw,
                InvoiceStatus::Verified => LegacyTransactStatus::Fn,
                InvoiceStatus::Cancelled => LegacyTransactStatus::Fn,
            }
        }
    };
    Some(status)
}

// Don't allow owned invoice updates, only inserts
fn check_owned_invoice_update(
    connection: &StorageConnection,
    invoice_upsert: &LegacyTransactRow,
) -> anyhow::Result<()> {
    let site_id = KeyValueStoreRepository::new(connection)
        .get_i32(repository::KeyType::SettingsSyncSiteId)?
        .context("Site id not set")?;

    let store = StoreRowRepository::new(connection)
        .find_one_by_id(&invoice_upsert.store_ID)?
        .context("Store not found")?;

    if store.site_id != site_id {
        return Ok(());
    }

    match InvoiceRowRepository::new(connection).find_one_by_id(&invoice_upsert.ID)? {
        Some(_) => Err(anyhow::anyhow!("Owned invoice updates are not allowed")),
        None => Ok(()),
    }
}
#[cfg(test)]
mod tests {
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        mock::{mock_store_a, MockData, MockDataInserts},
        test_db::{setup_all, setup_all_with_data},
        ChangelogFilter, ChangelogRepository, KeyType, KeyValueStoreRow,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_invoice_translation() {
        use crate::sync::test::test_data::invoice as test_data;
        let translator = InvoiceTranslation {};

        let (_, connection, _, _) = setup_all_with_data(
            "test_invoice_translation",
            MockDataInserts::none().names().stores().currencies(),
            MockData {
                key_value_store_rows: vec![KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(mock_store_a().site_id),
                    ..Default::default()
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

        // Check missing user got created
        let user = UserAccountRowRepository::new(&connection)
            .find_one_by_id("MISSING_USER_ID")
            .unwrap()
            .unwrap();
        assert_eq!(user.id, "MISSING_USER_ID");
    }

    #[actix_rt::test]
    async fn test_invoice_push_merged() {
        let (mock_data, connection, _, _) =
            setup_all("test_invoice_push_merged", MockDataInserts::all()).await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::Invoice.equal_to())),
            )
            .unwrap();

        let translator = InvoiceTranslation {};
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
