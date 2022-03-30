use chrono::NaiveDate;
use repository::{
    schema::{
        ChangelogRow, ChangelogTableName, RemoteSyncBufferRow, RequisitionRow,
        RequisitionRowStatus, RequisitionRowType,
    },
    RequisitionRowRepository, StorageConnection,
};

use serde::{Deserialize, Serialize};
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use crate::sync::SyncTranslationError;

use super::{
    date_and_time_to_datatime, date_from_date_time, date_option_to_isostring, date_to_isostring,
    empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{to_push_translation_error, PushUpsertRecord, RemotePushUpsertTranslation},
    zero_date_as_option, TRANSLATION_RECORD_REQUISITION,
};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyRequisitionType {
    /// A response to the request created for the suppling store
    #[serde(rename = "response")]
    Response,
    /// A request from a facility where they determine the quantity. If between facilities,
    /// duplicate supply requisition is created on finalisation in the supplying store
    #[serde(rename = "request")]
    Request,
    /// for stock history, where the facility submits stock on hand, and their history is used to
    /// determine a supply quantity
    #[serde(rename = "sh")]
    Sh,
    /// for imprest (where each item has a pre-determined max quantity and the facility submits
    /// their current stock on hand)
    #[serde(rename = "im")]
    Im,
    /// the supplying store's copy of a request requisition
    #[serde(rename = "supply")]
    Supply,
    /// A requisition that is for reporting purposes only.
    #[serde(rename = "report")]
    Report,
}

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyRequisitionStatus {
    /// suggested
    #[serde(rename = "sg")]
    Sg,
    /// confirmed
    #[serde(rename = "cn")]
    Cn,
    /// finalised
    #[serde(rename = "fn")]
    Fn,
    /// web: still in progress
    #[serde(rename = "wp")]
    Wp,
    /// finalised by customer after web submission
    #[serde(rename = "wf")]
    Wf,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyRequisitionRow {
    pub ID: String,
    pub serial_number: i64,
    pub name_ID: String,
    pub store_ID: String,
    pub r#type: LegacyRequisitionType,
    pub status: LegacyRequisitionStatus,
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "user_ID")]
    pub user_id: Option<String>,
    // created_datetime
    #[serde(serialize_with = "date_to_isostring")]
    pub date_entered: NaiveDate,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_stock_take: Option<NaiveDate>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_order_received: Option<NaiveDate>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub requester_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub linked_requisition_id: Option<String>,
    /// min_months_of_stock
    pub thresholdMOS: f64,
    // TODO needs a om_max_months_of_stock value in mSupply
    pub daysToSupply: i64,

    /// Colour number mapped to an internal colour
    pub colour: Option<i64>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
}

pub struct RequisitionTranslation {}
impl RemotePullTranslation for RequisitionTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_REQUISITION;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyRequisitionRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        let t = from_legacy_type(&data.r#type).ok_or(SyncTranslationError {
            table_name,
            source: anyhow::Error::msg(format!("Unsupported requisition type: {:?}", data.r#type)),
            record: sync_record.data.clone(),
        })?;
        let status = from_legacy_status(&data.status).ok_or(SyncTranslationError {
            table_name,
            source: anyhow::Error::msg(format!(
                "Unsupported requisition status: {:?}",
                data.status
            )),
            record: sync_record.data.clone(),
        })?;
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Requisition(RequisitionRow {
                id: data.ID.to_string(),
                user_id: data.user_id,
                requisition_number: data.serial_number,
                name_id: data.name_ID,
                store_id: data.store_ID,
                r#type: t,
                status,
                created_datetime: date_and_time_to_datatime(data.date_entered, 0),
                // TODO needs new field in mSupply
                sent_datetime: None,
                // TODO needs new field in mSupply
                finalised_datetime: None,
                colour: data.colour.and_then(|colour| req_colour_to_hex(colour)),
                comment: data.comment,
                their_reference: data.requester_reference,
                max_months_of_stock: data.daysToSupply as f64 / NUMBER_OF_DAYS_IN_A_MONTH,
                min_months_of_stock: data.thresholdMOS,
                linked_requisition_id: data.linked_requisition_id,
                // TODO translate om_expected_delivery_date
                expected_delivery_date: None,
            }),
        )))
    }
}

impl RemotePushUpsertTranslation for RequisitionTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, SyncTranslationError> {
        if changelog.table_name != ChangelogTableName::Requisition {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_REQUISITION;

        let RequisitionRow {
            id,
            user_id,
            requisition_number,
            name_id,
            store_id,
            r#type,
            status,
            created_datetime,
            // TODO:
            sent_datetime: _,
            // TODO:
            finalised_datetime: _,
            colour,
            comment,
            their_reference,
            max_months_of_stock,
            min_months_of_stock,
            linked_requisition_id,
            // TODO translate om_expected_delivery_date
            expected_delivery_date: _,
        } = RequisitionRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)
            .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?
            .ok_or(to_push_translation_error(
                table_name,
                anyhow::Error::msg(format!("Requisition row not found: {}", changelog.row_id)),
                changelog,
            ))?;

        let legacy_row = LegacyRequisitionRow {
            ID: id.clone(),
            user_id,
            serial_number: requisition_number,
            name_ID: name_id,
            store_ID: store_id.clone(),
            r#type: to_legacy_type(&r#type),
            status: to_legacy_status(&status),
            date_entered: date_from_date_time(&created_datetime),
            // TODO
            date_stock_take: None,
            // TODO
            date_order_received: None,
            requester_reference: their_reference,
            linked_requisition_id,
            thresholdMOS: min_months_of_stock,
            daysToSupply: (NUMBER_OF_DAYS_IN_A_MONTH * max_months_of_stock) as i64,
            // Note, this loses the color if colour is not supported by mSupply
            colour: colour.and_then(|colour| hex_colour_to_req_colour(&colour)),
            comment,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)
                .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?,
        }]))
    }
}

fn from_legacy_type(t: &LegacyRequisitionType) -> Option<RequisitionRowType> {
    let t = match t {
        LegacyRequisitionType::Response => RequisitionRowType::Response,
        LegacyRequisitionType::Request => RequisitionRowType::Request,
        _ => return None,
    };
    Some(t)
}

fn to_legacy_type(t: &RequisitionRowType) -> LegacyRequisitionType {
    match t {
        RequisitionRowType::Request => LegacyRequisitionType::Request,
        RequisitionRowType::Response => LegacyRequisitionType::Response,
    }
}

fn from_legacy_status(status: &LegacyRequisitionStatus) -> Option<RequisitionRowStatus> {
    let status = match status {
        LegacyRequisitionStatus::Sg => RequisitionRowStatus::Draft,
        &LegacyRequisitionStatus::Cn => RequisitionRowStatus::New,
        LegacyRequisitionStatus::Fn => RequisitionRowStatus::Finalised,
        _ => return None,
    };
    Some(status)
}

fn to_legacy_status(status: &RequisitionRowStatus) -> LegacyRequisitionStatus {
    match status {
        RequisitionRowStatus::Draft => LegacyRequisitionStatus::Sg,
        RequisitionRowStatus::New => LegacyRequisitionStatus::Cn,
        RequisitionRowStatus::Sent => LegacyRequisitionStatus::Fn,
        RequisitionRowStatus::Finalised => LegacyRequisitionStatus::Fn,
    }
}

fn hex_colour_to_req_colour(colour: &str) -> Option<i64> {
    let colour = match colour {
        "#1A1919" => 1,
        "#F57231" => 2,
        "#F982D8" => 3,
        "#F40E29" => 4,
        "#8AD6FE" => 5,
        "#3B10FD" => 6,
        "#219205" => 7,
        "#8C000D" => 8,
        _ => return None,
    };
    Some(colour)
}

fn req_colour_to_hex(colour: i64) -> Option<String> {
    let colour = match colour {
        // black
        1 => "#1A1919",
        // orange
        2 => "#F57231",
        // red
        3 => "#F982D8",
        // red ribbon
        4 => "#F40E29",
        // cyan
        5 => "#8AD6FE",
        // blue
        6 => "#3B10FD",
        // green
        7 => "#219205",
        // brown
        8 => "#8C000D",
        _ => return None,
    };
    Some(colour.to_string())
}
