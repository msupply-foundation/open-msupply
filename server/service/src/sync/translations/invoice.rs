use crate::sync::{
    sync_serde::{
        date_from_date_time, date_option_to_isostring, date_to_isostring, empty_str_as_option,
        empty_str_as_option_string, naive_time, zero_date_as_option,
    },
    translations::{
        clinician::ClinicianTranslation, currency::CurrencyTranslation, name::NameTranslation,
        store::StoreTranslation,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, Invoice, InvoiceFilter, InvoiceRepository,
    InvoiceRow, InvoiceRowDelete, InvoiceRowStatus, InvoiceRowType, NameRow, NameRowRepository,
    StorageConnection, StoreRowRepository, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
    /// Bucket to catch all other variants
    /// E.g. "cc" (customer credit), "bu" (build),
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
    pub currency_id: String,
    pub currency_rate: f64,

    #[serde(default)]
    #[serde(rename = "om_transport_reference")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub transport_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub requisition_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub linked_transaction_id: Option<String>,

    /// creation time
    #[serde(serialize_with = "date_to_isostring")]
    pub entry_date: NaiveDate, // e.g. "2021-07-30",
    /// time in seconds
    #[serde(deserialize_with = "naive_time")]
    pub entry_time: NaiveTime, // e.g. 47046,
    /// shipped_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub ship_date: Option<NaiveDate>, // "0000-00-00",
    /// delivered_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub arrival_date_actual: Option<NaiveDate>,
    /// verified_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub confirm_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub confirm_time: NaiveTime,

    pub mode: TransactMode,
    pub tax: Option<f64>,

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

    #[serde(default)]
    #[serde(rename = "om_verified_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub verified_datetime: Option<NaiveDateTime>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_status: Option<InvoiceRowStatus>,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_type: Option<InvoiceRowType>,

    /// We ignore the legacy colour field
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub om_colour: Option<String>,
}

/// The mSupply central server will map outbound invoices from omSupply to "si" invoices for the
/// receiving store.
/// In the current version of mSupply all om_ fields get copied though.
/// When receiving the transferred invoice on the omSupply store the "si" get translated to
/// outbound shipments because the om_type will override to legacy type field.
/// In other word, the inbound shipment will have an outbound type!
/// This function detect this case and removes all om_* fields from the incoming record.
fn sanitize_legacy_record(mut data: serde_json::Value) -> serde_json::Value {
    let Some(Ok(om_type)) = data
        .get("om_type")
        .map(|value| serde_json::from_value::<InvoiceRowType>(value.clone()))
    else {
        return data;
    };
    let Some(Ok(legacy_type)) = data
        .get("type")
        .map(|value| serde_json::from_value::<LegacyTransactType>(value.clone()))
    else {
        return data;
    };
    if legacy_type == LegacyTransactType::Si && om_type == InvoiceRowType::OutboundShipment {
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
    fn table_name(&self) -> &'static str {
        "transact"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            ClinicianTranslation.table_name(),
            CurrencyTranslation.table_name(),
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

        let name = NameRowRepository::new(connection)
            .find_one_by_id(&data.name_ID)
            .ok()
            .flatten()
            .ok_or(anyhow::Error::msg(format!(
                "Missing name: {}",
                data.name_ID
            )))?;

        let name_store_id = StoreRowRepository::new(connection)
            .find_one_by_name_id(&data.name_ID)?
            .map(|store_row| store_row.id);

        let invoice_type = invoice_type(&data, &name).ok_or(anyhow::Error::msg(format!(
            "Unsupported invoice type: {:?} for {:?} mode",
            data._type, data.mode
        )))?;
        let invoice_status = invoice_status(&invoice_type, &data).ok_or(anyhow::Error::msg(
            format!("Unsupported invoice type: {:?}", data._type),
        ))?;
        let mapping = map_legacy(&invoice_type, &data);

        let result = InvoiceRow {
            id: data.ID,
            user_id: data.user_id,
            store_id: data.store_ID,
            name_link_id: data.name_ID,
            name_store_id,
            invoice_number: data.invoice_num,
            r#type: data.om_type.unwrap_or(invoice_type),
            status: data.om_status.unwrap_or(invoice_status),
            on_hold: data.hold,
            comment: data.comment,
            their_reference: data.their_ref,
            tax: data.tax,
            currency_id: data.currency_id,
            currency_rate: data.currency_rate,
            clinician_link_id: data.clinician_id,

            // new om field mappings
            created_datetime: mapping.created_datetime,
            allocated_datetime: mapping.allocated_datetime,
            picked_datetime: mapping.picked_datetime,
            shipped_datetime: mapping.shipped_datetime,
            delivered_datetime: mapping.delivered_datetime,
            verified_datetime: mapping.verified_datetime,
            colour: mapping.colour,

            requisition_id: data.requisition_ID,
            linked_invoice_id: data.linked_transaction_id,
            transport_reference: data.transport_reference,
        };

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
            .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(&changelog.record_id)))?
            .pop()
        else {
            return Err(anyhow::anyhow!("Invoice not found"));
        };

        // log::info!("Translating invoice row: {:#?}", invoice_row);

        let confirm_datetime = to_legacy_confirm_time(&invoice.invoice_row);

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
                    delivered_datetime,
                    verified_datetime,
                    colour,
                    requisition_id,
                    linked_invoice_id,
                    transport_reference,
                    tax,
                    clinician_link_id: _,
                    currency_id,
                    currency_rate,
                },
            name_row,
            clinician_row,
            ..
        } = invoice;

        let _type = legacy_invoice_type(&r#type).ok_or(anyhow::Error::msg(format!(
            "Invalid invoice type: {:?}",
            r#type
        )))?;
        let legacy_status = legacy_invoice_status(&r#type, &status).ok_or(anyhow::Error::msg(
            format!("Invalid invoice status: {:?}", r#status),
        ))?;

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
            entry_time: created_datetime.time(),
            ship_date: shipped_datetime
                .map(|shipped_datetime| date_from_date_time(&shipped_datetime)),
            arrival_date_actual: delivered_datetime
                .map(|delivered_datetime| date_from_date_time(&delivered_datetime)),
            confirm_date: confirm_datetime.0,
            confirm_time: confirm_datetime.1,
            tax,
            mode: if r#type == InvoiceRowType::Prescription {
                TransactMode::Dispensary
            } else {
                TransactMode::Store
            },
            transport_reference,
            created_datetime: Some(created_datetime),
            allocated_datetime,
            picked_datetime,
            shipped_datetime,
            delivered_datetime,
            verified_datetime,
            om_status: Some(status),
            om_type: Some(r#type),
            om_colour: colour,
            currency_id,
            currency_rate,
            clinician_id: clinician_row.map(|row| row.id),
        };

        let json_record = serde_json::to_value(&legacy_row)?;

        // log::info!(
        //     "Translated row {}",
        //     serde_json::to_string_pretty(&json_record)
        //         .unwrap_or("Failed to stringify json".to_string())
        // );

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

fn invoice_type(data: &LegacyTransactRow, name: &NameRow) -> Option<InvoiceRowType> {
    if name.code == INVENTORY_ADJUSTMENT_NAME_CODE {
        return match data._type {
            LegacyTransactType::Si => Some(InvoiceRowType::InventoryAddition),
            LegacyTransactType::Sc => Some(InvoiceRowType::InventoryReduction),
            _ => return None,
        };
    }
    if data.mode == TransactMode::Dispensary {
        return match data._type {
            LegacyTransactType::Ci => Some(InvoiceRowType::Prescription),
            _ => return None,
        };
    }
    match data._type {
        LegacyTransactType::Si => Some(InvoiceRowType::InboundShipment),
        LegacyTransactType::Ci => Some(InvoiceRowType::OutboundShipment),
        LegacyTransactType::Sr => Some(InvoiceRowType::Repack),
        _ => return None,
    }
}

/// Helper struct for new om_* fields mappings
struct LegacyMapping {
    created_datetime: NaiveDateTime,
    picked_datetime: Option<NaiveDateTime>,
    delivered_datetime: Option<NaiveDateTime>,
    allocated_datetime: Option<NaiveDateTime>,
    shipped_datetime: Option<NaiveDateTime>,
    verified_datetime: Option<NaiveDateTime>,
    colour: Option<String>,
}
/// Either make use of om_* fields, if present, or do a best afford mapping
fn map_legacy(invoice_type: &InvoiceRowType, data: &LegacyTransactRow) -> LegacyMapping {
    // If created_datetime (om_created_datetime) exists then the record was created in omSupply and
    // omSupply fields are used
    if let Some(created_datetime) = data.created_datetime {
        return LegacyMapping {
            created_datetime,
            picked_datetime: data.picked_datetime,
            delivered_datetime: data.delivered_datetime,
            allocated_datetime: data.allocated_datetime,
            shipped_datetime: data.shipped_datetime,
            verified_datetime: data.verified_datetime,
            colour: data.om_colour.clone(),
        };
    }

    let mut mapping = LegacyMapping {
        created_datetime: NaiveDateTime::new(data.entry_date, data.entry_time),
        picked_datetime: None,
        delivered_datetime: None,
        allocated_datetime: None,
        shipped_datetime: None,
        verified_datetime: None,
        colour: None,
    };

    let confirm_datetime = data
        .confirm_date
        .map(|confirm_date| NaiveDateTime::new(confirm_date, data.confirm_time));

    match invoice_type {
        InvoiceRowType::OutboundShipment => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.allocated_datetime = confirm_datetime.clone();
                mapping.picked_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.allocated_datetime = confirm_datetime.clone();
                mapping.picked_datetime = confirm_datetime.clone();
                mapping.shipped_datetime = confirm_datetime;
            }
            _ => {}
        },
        InvoiceRowType::InboundShipment => {
            mapping.delivered_datetime = confirm_datetime;

            match data.status {
                LegacyTransactStatus::Cn => {
                    mapping.delivered_datetime = confirm_datetime;
                }
                LegacyTransactStatus::Fn => {
                    mapping.delivered_datetime = confirm_datetime.clone();
                    mapping.verified_datetime = confirm_datetime;
                }
                _ => {}
            }
        }
        InvoiceRowType::Prescription => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.picked_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.picked_datetime = confirm_datetime.clone();
                mapping.verified_datetime = confirm_datetime;
            }
            _ => {}
        },
        InvoiceRowType::InventoryAddition | InvoiceRowType::InventoryReduction => match data.status
        {
            LegacyTransactStatus::Cn => {
                mapping.verified_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.verified_datetime = confirm_datetime;
            }
            _ => {}
        },
        InvoiceRowType::Repack => match data.status {
            LegacyTransactStatus::Cn => {
                mapping.verified_datetime = confirm_datetime;
            }
            LegacyTransactStatus::Fn => {
                mapping.verified_datetime = confirm_datetime;
            }
            _ => {}
        },
    };
    mapping
}

fn to_legacy_confirm_time(
    InvoiceRow {
        r#type,
        picked_datetime,
        delivered_datetime,
        verified_datetime,
        ..
    }: &InvoiceRow,
) -> (Option<NaiveDate>, NaiveTime) {
    let datetime = match r#type {
        InvoiceRowType::OutboundShipment => picked_datetime,
        InvoiceRowType::InboundShipment => delivered_datetime,
        InvoiceRowType::Prescription => picked_datetime,
        InvoiceRowType::InventoryAddition
        | InvoiceRowType::InventoryReduction
        | InvoiceRowType::Repack => verified_datetime,
    };

    let date = datetime.map(|datetime| datetime.date());
    let time = datetime
        .map(|datetime| datetime.time())
        .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap());
    (date, time)
}

fn invoice_status(
    invoice_type: &InvoiceRowType,
    data: &LegacyTransactRow,
) -> Option<InvoiceRowStatus> {
    let status = match invoice_type {
        // prescription
        InvoiceRowType::Prescription => match data.status {
            LegacyTransactStatus::Nw => InvoiceRowStatus::New,
            LegacyTransactStatus::Sg => InvoiceRowStatus::New,
            LegacyTransactStatus::Cn => InvoiceRowStatus::Picked,
            LegacyTransactStatus::Fn => InvoiceRowStatus::Verified,
            _ => return None,
        },
        // outbound
        InvoiceRowType::OutboundShipment => match data.status {
            LegacyTransactStatus::Nw => InvoiceRowStatus::New,
            LegacyTransactStatus::Sg => InvoiceRowStatus::New,
            LegacyTransactStatus::Cn => InvoiceRowStatus::Picked,
            LegacyTransactStatus::Fn => InvoiceRowStatus::Shipped,
            _ => return None,
        },
        // inbound
        InvoiceRowType::InboundShipment => match data.status {
            LegacyTransactStatus::Sg => InvoiceRowStatus::New,
            LegacyTransactStatus::Nw => InvoiceRowStatus::New,
            LegacyTransactStatus::Cn => InvoiceRowStatus::Delivered,
            LegacyTransactStatus::Fn => InvoiceRowStatus::Verified,
            _ => return None,
        },
        InvoiceRowType::InventoryAddition
        | InvoiceRowType::InventoryReduction
        | InvoiceRowType::Repack => match data.status {
            LegacyTransactStatus::Nw => InvoiceRowStatus::New,
            LegacyTransactStatus::Sg => InvoiceRowStatus::New,
            LegacyTransactStatus::Cn => InvoiceRowStatus::Verified,
            LegacyTransactStatus::Fn => InvoiceRowStatus::Verified,
            _ => return None,
        },
    };
    Some(status)
}

fn legacy_invoice_type(_type: &InvoiceRowType) -> Option<LegacyTransactType> {
    let t = match _type {
        InvoiceRowType::OutboundShipment => LegacyTransactType::Ci,
        InvoiceRowType::InboundShipment => LegacyTransactType::Si,
        // prescription
        InvoiceRowType::Prescription => LegacyTransactType::Ci,
        // Inventory Adjustment
        InvoiceRowType::InventoryAddition => LegacyTransactType::Si,
        InvoiceRowType::InventoryReduction => LegacyTransactType::Sc,
        InvoiceRowType::Repack => LegacyTransactType::Sr,
    };
    return Some(t);
}

fn legacy_invoice_status(
    t: &InvoiceRowType,
    status: &InvoiceRowStatus,
) -> Option<LegacyTransactStatus> {
    let status = match t {
        InvoiceRowType::OutboundShipment => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Sg,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Sg,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
        InvoiceRowType::InboundShipment => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
        InvoiceRowType::Prescription => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
        InvoiceRowType::InventoryAddition
        | InvoiceRowType::InventoryReduction
        | InvoiceRowType::Repack => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
    };
    Some(status)
}

#[cfg(test)]
mod tests {
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_invoice_translation() {
        use crate::sync::test::test_data::invoice as test_data;
        let translator = InvoiceTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_invoice_translation",
            MockDataInserts::none().names().stores(),
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
