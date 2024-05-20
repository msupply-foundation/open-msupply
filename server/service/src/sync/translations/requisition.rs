use chrono::{DateTime, NaiveDate, NaiveDateTime};
use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    ApprovalStatusType, ChangelogRow, ChangelogTableName, EqualFilter, InvoiceFilter,
    InvoiceRepository, ProgramRowRepository, Requisition, RequisitionFilter, RequisitionRepository,
    RequisitionRow, RequisitionRowDelete, StorageConnection, SyncBufferRow,
};

use serde::{Deserialize, Serialize};
use util::constants::{MISSING_PROGRAM, NUMBER_OF_DAYS_IN_A_MONTH};

use crate::sync::{
    sync_serde::{
        date_and_time_to_datetime, date_from_date_time, date_option_to_isostring,
        date_to_isostring, empty_str_as_option, empty_str_as_option_string, zero_date_as_option,
    },
    translations::{
        master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
        store::StoreTranslation,
    },
};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
    /// Bucket to catch all other variants
    #[serde(other)]
    Others,
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
    /// new
    /// Note: this shouldn't be possible in mSupply but is seen in historical datasets
    #[serde(rename = "nw")]
    Nw,
    /// Bucket to catch all other variants
    /// E.g. "wp" (web progress), "wf" (web finalised)
    #[serde(other)]
    Others,
}

// https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/AUTHORISATION_STATUSES.4dm
#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum LegacyAuthorisationStatus {
    None,
    Pending,
    Authorised,
    Denied,
    #[serde(rename = "auto-authorised")]
    AutoAuthorised,
    #[serde(rename = "authorised by another authoriser")]
    AuthorisedByAnother,
    #[serde(rename = "denied by another authoriser")]
    DeniedByAnother,
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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "user_ID")]
    pub user_id: Option<String>,
    // created_datetime
    #[serde(serialize_with = "date_to_isostring")]
    pub date_entered: NaiveDate,

    #[serde(rename = "lastModifiedAt")]
    pub last_modified_at: i64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub requester_reference: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub linked_requisition_id: Option<String>,
    /// min_months_of_stock
    pub thresholdMOS: f64,
    /// relates to max_months_of_stock
    pub daysToSupply: i64,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,

    #[serde(default)]
    #[serde(rename = "om_created_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_sent_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub sent_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_finalised_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub finalised_datetime: Option<NaiveDateTime>,

    #[serde(default)]
    #[serde(rename = "om_expected_delivery_date")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expected_delivery_date: Option<NaiveDate>,

    #[serde(rename = "om_max_months_of_stock")]
    pub max_months_of_stock: Option<f64>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub om_status: Option<RequisitionStatus>,
    /// We ignore the legacy colour field
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub om_colour: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(rename = "authorisationStatus")]
    pub approval_status: Option<LegacyAuthorisationStatus>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub orderType: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub periodID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub programID: Option<String>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RequisitionTranslation)
}

pub(super) struct RequisitionTranslation;
impl SyncTranslation for RequisitionTranslation {
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
        Some(ChangelogTableName::Requisition)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        conn: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyRequisitionRow>(&sync_record.data)?;
        let r#type = match from_legacy_type(&data.r#type) {
            Some(r#type) => r#type,
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "Unsupported requisition type: {:?}",
                    data.r#type
                )))
            }
        };

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
                data.om_status.ok_or(anyhow::Error::msg(
                    "Invalid data: om_created_datetime set but om_status missing",
                ))?,
                data.om_colour,
            ),
            None => (
                date_and_time_to_datetime(data.date_entered, 0),
                from_legacy_sent_datetime(data.last_modified_at, &r#type),
                from_legacy_finalised_datetime(data.last_modified_at, &r#type),
                data.daysToSupply as f64 / NUMBER_OF_DAYS_IN_A_MONTH,
                from_legacy_status(&data.r#type, &data.status).ok_or(anyhow::Error::msg(
                    format!("Unsupported requisition status: {:?}", data.status),
                ))?,
                None,
            ),
        };

        // TODO: Delete when soft delete for master list is implemented
        let program_id = if let Some(program_id) = data.programID {
            let program = ProgramRowRepository::new(conn).find_one_by_id(&program_id)?;

            match program {
                Some(program) => Some(program.id),
                None => Some(MISSING_PROGRAM.to_string()),
            }
        } else {
            None
        };

        let result = RequisitionRow {
            id: data.ID.to_string(),
            user_id: data.user_id,
            requisition_number: data.serial_number,
            name_link_id: data.name_ID,
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
            expected_delivery_date: data.expected_delivery_date,
            approval_status: data.approval_status.map(|s| s.to()),
            program_id,
            period_id: data.periodID,
            order_type: data.orderType,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        Ok(PullTranslateResult::delete(RequisitionRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Requisition {
            requisition_row:
                RequisitionRow {
                    id,
                    user_id,
                    requisition_number,
                    name_link_id: _,
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
                    expected_delivery_date,
                    approval_status,
                    program_id,
                    period_id,
                    order_type,
                },
            name_row,
            ..
        } = RequisitionRepository::new(connection)
            .query_by_filter(
                RequisitionFilter::new().id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .pop()
            .ok_or_else(|| anyhow::anyhow!("Requisition not found"))?;

        let has_outbound_shipment = !InvoiceRepository::new(connection)
            .query_by_filter(InvoiceFilter::new().requisition_id(EqualFilter::equal_to(&id)))?
            .is_empty();

        let legacy_row = LegacyRequisitionRow {
            ID: id.clone(),
            user_id,
            serial_number: requisition_number,
            name_ID: name_row.id,
            store_ID: store_id.clone(),
            r#type: to_legacy_type(&r#type),
            status: to_legacy_status(&r#type, &status, has_outbound_shipment).ok_or(
                anyhow::Error::msg(format!(
                    "Unexpected row requisition status {:?} (type: {:?}), row id:{}",
                    status, r#type, changelog.record_id
                )),
            )?,
            om_status: Some(status),
            date_entered: date_from_date_time(&created_datetime),
            created_datetime: Some(created_datetime),
            last_modified_at: to_legacy_last_modified_at(
                &r#type,
                sent_datetime,
                finalised_datetime,
            ),
            sent_datetime,
            finalised_datetime,
            expected_delivery_date,
            requester_reference: their_reference,
            linked_requisition_id,
            thresholdMOS: min_months_of_stock,
            daysToSupply: (NUMBER_OF_DAYS_IN_A_MONTH * max_months_of_stock) as i64,
            max_months_of_stock: Some(max_months_of_stock),
            om_colour: colour.clone(),
            comment,
            approval_status: approval_status.map(LegacyAuthorisationStatus::from),
            programID: program_id,
            periodID: period_id,
            orderType: order_type,
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

fn from_legacy_sent_datetime(
    last_modified_at: i64,
    r#type: &RequisitionType,
) -> Option<NaiveDateTime> {
    match r#type {
        RequisitionType::Request => {
            if last_modified_at > 0 {
                Some(
                    DateTime::from_timestamp(last_modified_at, 0)
                        .unwrap()
                        .naive_utc(),
                )
            } else {
                None
            }
        }
        RequisitionType::Response => None,
    }
}

fn from_legacy_finalised_datetime(
    last_modified_at: i64,
    r#type: &RequisitionType,
) -> Option<NaiveDateTime> {
    match r#type {
        RequisitionType::Request => None,
        RequisitionType::Response => {
            if last_modified_at > 0 {
                Some(
                    DateTime::from_timestamp(last_modified_at, 0)
                        .unwrap()
                        .naive_utc(),
                )
            } else {
                None
            }
        }
    }
}

fn to_legacy_last_modified_at(
    r#type: &RequisitionType,
    sent_datetime: Option<NaiveDateTime>,
    finalised_datetime: Option<NaiveDateTime>,
) -> i64 {
    match r#type {
        RequisitionType::Request => sent_datetime
            .map(|time| time.and_utc().timestamp())
            .unwrap_or(0),
        RequisitionType::Response => finalised_datetime
            .map(|time| time.and_utc().timestamp())
            .unwrap_or(0),
    }
}

fn from_legacy_type(t: &LegacyRequisitionType) -> Option<RequisitionType> {
    let t = match t {
        LegacyRequisitionType::Response => RequisitionType::Response,
        LegacyRequisitionType::Request => RequisitionType::Request,
        _ => return None,
    };
    Some(t)
}

fn to_legacy_type(t: &RequisitionType) -> LegacyRequisitionType {
    match t {
        RequisitionType::Request => LegacyRequisitionType::Request,
        RequisitionType::Response => LegacyRequisitionType::Response,
    }
}

fn from_legacy_status(
    r#type: &LegacyRequisitionType,
    status: &LegacyRequisitionStatus,
) -> Option<RequisitionStatus> {
    let status = match r#type {
        LegacyRequisitionType::Request => match status {
            LegacyRequisitionStatus::Sg => RequisitionStatus::Draft,
            &LegacyRequisitionStatus::Cn => RequisitionStatus::Sent,
            LegacyRequisitionStatus::Fn => RequisitionStatus::Sent,
            // Note, nw shouldn't be possible but is seen historical data:
            LegacyRequisitionStatus::Nw => RequisitionStatus::Draft,
            LegacyRequisitionStatus::Others => return None,
        },
        LegacyRequisitionType::Response => match status {
            LegacyRequisitionStatus::Sg => RequisitionStatus::New,
            &LegacyRequisitionStatus::Cn => RequisitionStatus::New,
            LegacyRequisitionStatus::Fn => RequisitionStatus::Finalised,
            // Note, nw shouldn't be possible but is seen historical data:
            LegacyRequisitionStatus::Nw => RequisitionStatus::New,
            LegacyRequisitionStatus::Others => return None,
        },
        _ => return None,
    };
    Some(status)
}

fn to_legacy_status(
    r#type: &RequisitionType,
    status: &RequisitionStatus,
    has_outbound_shipment: bool,
) -> Option<LegacyRequisitionStatus> {
    let status = match r#type {
        RequisitionType::Request => match status {
            RequisitionStatus::Draft => LegacyRequisitionStatus::Sg,
            RequisitionStatus::Sent => LegacyRequisitionStatus::Fn,
            RequisitionStatus::Finalised => LegacyRequisitionStatus::Fn,
            _ => return None,
        },
        RequisitionType::Response => match status {
            RequisitionStatus::New if has_outbound_shipment => LegacyRequisitionStatus::Cn,
            RequisitionStatus::New => LegacyRequisitionStatus::Sg,
            RequisitionStatus::Finalised => LegacyRequisitionStatus::Fn,
            _ => return None,
        },
    };
    Some(status)
}

impl LegacyAuthorisationStatus {
    fn to(self) -> ApprovalStatusType {
        use ApprovalStatusType as to;
        use LegacyAuthorisationStatus as from;
        match self {
            from::None => to::None,
            from::Pending => to::Pending,
            from::Authorised => to::Approved,
            from::Denied => to::Denied,
            from::AutoAuthorised => to::AutoApproved,
            from::AuthorisedByAnother => to::ApprovedByAnother,
            from::DeniedByAnother => to::DeniedByAnother,
        }
    }

    fn from(status: ApprovalStatusType) -> LegacyAuthorisationStatus {
        use ApprovalStatusType as from;
        use LegacyAuthorisationStatus as to;
        match status {
            from::None => to::None,
            from::Pending => to::Pending,
            from::Approved => to::Authorised,
            from::Denied => to::Denied,
            from::AutoApproved => to::AutoAuthorised,
            from::ApprovedByAnother => to::AuthorisedByAnother,
            from::DeniedByAnother => to::DeniedByAnother,
        }
    }
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
    async fn test_requisition_translation() {
        use crate::sync::test::test_data::requisition as test_data;
        let translator = RequisitionTranslation {};

        let (_, connection, _, _) =
            setup_all("test_requisition_translation", MockDataInserts::none()).await;

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
    async fn test_requisition_push_merged() {
        let (mock_data, connection, _, _) = setup_all(
            "test_requisition_push_merged",
            MockDataInserts::none().names().stores().requisitions(),
        )
        .await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::Requisition.equal_to())),
            )
            .unwrap();

        let translator = RequisitionTranslation {};
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
