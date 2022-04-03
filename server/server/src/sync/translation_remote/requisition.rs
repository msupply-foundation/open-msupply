use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    schema::{
        ChangelogRow, ChangelogTableName, RemoteSyncBufferRow, RequisitionRow,
        RequisitionRowStatus, RequisitionRowType,
    },
    RequisitionRowRepository, StorageConnection,
};

use serde::{Deserialize, Serialize};
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use super::{
    date_and_time_to_datatime, date_from_date_time, date_to_isostring, empty_date_time_as_option,
    empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{PushUpsertRecord, RemotePushUpsertTranslation},
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RequisitionStatus {
    Draft,
    New,
    Sent,
    Finalised,
}

impl RequisitionStatus {
    fn to_domain(&self) -> RequisitionRowStatus {
        match self {
            RequisitionStatus::Draft => RequisitionRowStatus::Draft,
            RequisitionStatus::New => RequisitionRowStatus::New,
            RequisitionStatus::Sent => RequisitionRowStatus::Sent,
            RequisitionStatus::Finalised => RequisitionRowStatus::Finalised,
        }
    }

    fn from_domain(status: RequisitionRowStatus) -> Self {
        match status {
            RequisitionRowStatus::Draft => RequisitionStatus::Draft,
            RequisitionRowStatus::New => RequisitionStatus::New,
            RequisitionRowStatus::Sent => RequisitionStatus::Sent,
            RequisitionRowStatus::Finalised => RequisitionStatus::Finalised,
        }
    }
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

    #[serde(rename = "lastModifiedAt")]
    pub last_modified_at: i64,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub requester_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub linked_requisition_id: Option<String>,
    /// min_months_of_stock
    pub thresholdMOS: f64,
    /// relates to max_months_of_stock
    pub daysToSupply: i64,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,

    #[serde(rename = "om_created_datetime")]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_sent_datetime")]
    #[serde(default)]
    #[serde(deserialize_with = "empty_date_time_as_option")]
    pub sent_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_finalised_datetime")]
    #[serde(default)]
    #[serde(deserialize_with = "empty_date_time_as_option")]
    pub finalised_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_expected_delivery_date")]
    #[serde(default)]
    #[serde(deserialize_with = "zero_date_as_option")]
    pub expected_delivery_date: Option<NaiveDate>,

    #[serde(rename = "om_max_months_of_stock")]
    #[serde(default)]
    pub max_months_of_stock: Option<f64>,
    #[serde(default)]
    pub om_status: Option<RequisitionStatus>,
    /// We ignore the legacy colour field
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_colour: Option<String>,
}

pub struct RequisitionTranslation {}
impl RemotePullTranslation for RequisitionTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_REQUISITION;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyRequisitionRow>(&sync_record.data)?;
        let r#type = from_legacy_type(&data.r#type).ok_or(anyhow::Error::msg(format!(
            "Unsupported requisition type: {:?}",
            data.r#type
        )))?;
        let (
            created_datetime,
            sent_datetime,
            finalised_datetime,
            max_months_of_stock,
            status,
            colour,
        ) = match data.created_datetime {
            // use new om_* fields
            Some(created_datetime) => (
                created_datetime,
                data.sent_datetime,
                data.finalised_datetime,
                data.max_months_of_stock.unwrap_or(0.0),
                data.om_status
                    .map(|s| s.to_domain())
                    .ok_or(anyhow::Error::msg(
                        "Invalid data: om_created_datetime set but om_status missing",
                    ))?,
                data.om_colour,
            ),
            None => (
                date_and_time_to_datatime(data.date_entered, 0),
                from_legacy_sent_datetime(data.last_modified_at, &r#type),
                from_legacy_finalised_datetime(data.last_modified_at, &r#type),
                data.daysToSupply as f64 / NUMBER_OF_DAYS_IN_A_MONTH,
                from_legacy_status(&data.r#type, &data.status).ok_or(anyhow::Error::msg(
                    format!("Unsupported requisition status: {:?}", data.status),
                ))?,
                None,
            ),
        };

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Requisition(RequisitionRow {
                id: data.ID.to_string(),
                user_id: data.user_id,
                requisition_number: data.serial_number,
                name_id: data.name_ID,
                store_id: data.store_ID,
                r#type,
                status,
                created_datetime,
                sent_datetime,
                finalised_datetime,
                colour,
                comment: data.comment,
                their_reference: data.requester_reference,
                max_months_of_stock,
                min_months_of_stock: data.thresholdMOS,
                linked_requisition_id: data.linked_requisition_id,
            }),
        )))
    }
}

fn from_legacy_sent_datetime(
    last_modified_at: i64,
    r#type: &RequisitionRowType,
) -> Option<NaiveDateTime> {
    match r#type {
        RequisitionRowType::Request => {
            if last_modified_at > 0 {
                Some(NaiveDateTime::from_timestamp(last_modified_at, 0))
            } else {
                None
            }
        }
        RequisitionRowType::Response => None,
    }
}

fn from_legacy_finalised_datetime(
    last_modified_at: i64,
    r#type: &RequisitionRowType,
) -> Option<NaiveDateTime> {
    match r#type {
        RequisitionRowType::Request => None,
        RequisitionRowType::Response => {
            if last_modified_at > 0 {
                Some(NaiveDateTime::from_timestamp(last_modified_at, 0))
            } else {
                None
            }
        }
    }
}

impl RemotePushUpsertTranslation for RequisitionTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
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
            sent_datetime,
            finalised_datetime,
            colour,
            comment,
            their_reference,
            max_months_of_stock,
            min_months_of_stock,
            linked_requisition_id,
        } = RequisitionRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Requisition row not found: {}",
                changelog.row_id
            )))?;

        let legacy_row = LegacyRequisitionRow {
            ID: id.clone(),
            user_id,
            serial_number: requisition_number,
            name_ID: name_id,
            store_ID: store_id.clone(),
            r#type: to_legacy_type(&r#type),
            status: to_legacy_status(&r#type, &status).ok_or(anyhow::Error::msg(format!(
                "Unexpected row requisition status {:?} (type: {:?}), row id:{}",
                status, r#type, changelog.row_id
            )))?,
            om_status: Some(RequisitionStatus::from_domain(status)),
            date_entered: date_from_date_time(&created_datetime),
            created_datetime: Some(created_datetime),
            last_modified_at: to_legacy_last_modified_at(
                &r#type,
                sent_datetime,
                finalised_datetime,
            ),
            sent_datetime: sent_datetime,
            finalised_datetime: finalised_datetime,
            // TODO:
            expected_delivery_date: None,
            requester_reference: their_reference,
            linked_requisition_id,
            thresholdMOS: min_months_of_stock,
            daysToSupply: (NUMBER_OF_DAYS_IN_A_MONTH * max_months_of_stock) as i64,
            max_months_of_stock: Some(max_months_of_stock),
            om_colour: colour.clone(),
            comment,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}

fn to_legacy_last_modified_at(
    r#type: &RequisitionRowType,
    sent_datetime: Option<NaiveDateTime>,
    finalised_datetime: Option<NaiveDateTime>,
) -> i64 {
    match r#type {
        RequisitionRowType::Request => sent_datetime.map(|time| time.timestamp()).unwrap_or(0),
        RequisitionRowType::Response => {
            finalised_datetime.map(|time| time.timestamp()).unwrap_or(0)
        }
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

fn from_legacy_status(
    r#type: &LegacyRequisitionType,
    status: &LegacyRequisitionStatus,
) -> Option<RequisitionRowStatus> {
    let status = match r#type {
        LegacyRequisitionType::Request => match status {
            LegacyRequisitionStatus::Sg => RequisitionRowStatus::Draft,
            &LegacyRequisitionStatus::Cn => RequisitionRowStatus::Sent,
            LegacyRequisitionStatus::Fn => RequisitionRowStatus::Sent,
            _ => return None,
        },
        LegacyRequisitionType::Response => match status {
            LegacyRequisitionStatus::Sg => return None,
            &LegacyRequisitionStatus::Cn => RequisitionRowStatus::New,
            LegacyRequisitionStatus::Fn => RequisitionRowStatus::Finalised,
            _ => return None,
        },
        _ => return None,
    };
    Some(status)
}

fn to_legacy_status(
    r#type: &RequisitionRowType,
    status: &RequisitionRowStatus,
) -> Option<LegacyRequisitionStatus> {
    let status = match r#type {
        RequisitionRowType::Request => match status {
            RequisitionRowStatus::Draft => LegacyRequisitionStatus::Sg,
            RequisitionRowStatus::Sent => LegacyRequisitionStatus::Fn,
            RequisitionRowStatus::Finalised => LegacyRequisitionStatus::Fn,
            _ => return None,
        },
        RequisitionRowType::Response => match status {
            RequisitionRowStatus::New => LegacyRequisitionStatus::Cn,
            RequisitionRowStatus::Finalised => LegacyRequisitionStatus::Fn,
            _ => return None,
        },
    };
    Some(status)
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::sync::translation_remote::{
        pull::RemotePullTranslation, test_data::requisition::get_test_requisition_records,
    };

    use super::RequisitionTranslation;

    #[actix_rt::test]
    async fn test_requisition_translation() {
        let (_, connection, _, _) =
            setup_all("test_requisition_translation", MockDataInserts::all()).await;

        let translator = RequisitionTranslation {};
        for record in get_test_requisition_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.remote_sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
