use chrono::NaiveDateTime;
use repository::{
    ActivityLogRow, ActivityLogRowRepository, ActivityLogType, ChangelogRow, ChangelogTableName,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{api::RemoteSyncRecordV5, sync_serde::empty_str_as_option};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::OM_ACTIVITY_LOG;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::ActivityLog
}

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyActivityLogType {
    #[serde(rename = "user_logged_in")]
    UserLoggedIn,
    #[serde(rename = "invoice_created")]
    InvoiceCreated,
    #[serde(rename = "invoice_deleted")]
    InvoiceDeleted,
    #[serde(rename = "invoice_status_allocated")]
    InvoiceStatusAllocated,
    #[serde(rename = "invoice_status_picked")]
    InvoiceStatusPicked,
    #[serde(rename = "invoice_status_shipped")]
    InvoiceStatusShipped,
    #[serde(rename = "invoice_status_delivered")]
    InvoiceStatusDelivered,
    #[serde(rename = "invoice_status_verified")]
    InvoiceStatusVerified,
    #[serde(rename = "stocktake_created")]
    StocktakeCreated,
    #[serde(rename = "stocktake_deleted")]
    StocktakeDeleted,
    #[serde(rename = "stocktake_status_finalised")]
    StocktakeStatusFinalised,
    #[serde(rename = "requisition_created")]
    RequisitionCreated,
    #[serde(rename = "requsition_deleted")]
    RequisitionDeleted,
    #[serde(rename = "requisition_status_sent")]
    RequisitionStatusSent,
    #[serde(rename = "requisition_status_finalised")]
    RequisitionStatusFinalised,
}

impl LegacyActivityLogType {
    fn to_log_type(&self) -> ActivityLogType {
        use ActivityLogType as to;
        use LegacyActivityLogType as from;

        match self {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
            from::InvoiceDeleted => to::InvoiceDeleted,
            from::InvoiceStatusAllocated => to::InvoiceStatusAllocated,
            from::InvoiceStatusPicked => to::InvoiceStatusPicked,
            from::InvoiceStatusShipped => to::InvoiceStatusShipped,
            from::InvoiceStatusDelivered => to::InvoiceStatusDelivered,
            from::InvoiceStatusVerified => to::InvoiceStatusVerified,
            from::StocktakeCreated => to::StocktakeCreated,
            from::StocktakeDeleted => to::StocktakeDeleted,
            from::StocktakeStatusFinalised => to::StocktakeStatusFinalised,
            from::RequisitionCreated => to::RequisitionCreated,
            from::RequisitionDeleted => to::RequisitionDeleted,
            from::RequisitionStatusSent => to::RequisitionStatusSent,
            from::RequisitionStatusFinalised => to::RequisitionStatusFinalised,
        }
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyActivityLogRow {
    pub ID: String,
    #[serde(rename = "type")]
    pub r#type: LegacyActivityLogType,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub user_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub store_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub record_ID: Option<String>,
    pub datetime: NaiveDateTime,
}

pub(crate) struct ActivityLogTranslation {}
impl SyncTranslation for ActivityLogTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyActivityLogRow>(&sync_record.data)?;

        let result = ActivityLogRow {
            id: data.ID.to_string(),
            r#type: data.r#type.to_log_type(),
            user_id: data.user_ID,
            store_id: data.store_ID,
            record_id: data.record_ID,
            datetime: data.datetime,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::ActivityLog(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let ActivityLogRow {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
            datetime,
        } = ActivityLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Activity log row ({}) not found",
                changelog.record_id
            )))?;

        // TODO if no store_id or record_id return Vec::new()

        let legacy_type = legacy_activity_log_type(&r#type).ok_or(anyhow::Error::msg(format!(
            "Invalid activity log type: {:?}",
            r#type
        )))?;

        let legacy_row = LegacyActivityLogRow {
            ID: id.clone(),
            r#type: legacy_type,
            user_ID: user_id,
            store_ID: store_id,
            record_ID: record_id,
            datetime,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}

fn legacy_activity_log_type(r#type: &ActivityLogType) -> Option<LegacyActivityLogType> {
    use ActivityLogType as from;
    use LegacyActivityLogType as to;

    match r#type {
        from::UserLoggedIn => Some(to::UserLoggedIn),
        from::InvoiceCreated => Some(to::InvoiceCreated),
        from::InvoiceDeleted => Some(to::InvoiceDeleted),
        from::InvoiceStatusAllocated => Some(to::InvoiceStatusAllocated),
        from::InvoiceStatusPicked => Some(to::InvoiceStatusPicked),
        from::InvoiceStatusShipped => Some(to::InvoiceStatusShipped),
        from::InvoiceStatusDelivered => Some(to::InvoiceStatusDelivered),
        from::InvoiceStatusVerified => Some(to::InvoiceStatusVerified),
        from::StocktakeCreated => Some(to::StocktakeCreated),
        from::StocktakeDeleted => Some(to::StocktakeDeleted),
        from::StocktakeStatusFinalised => Some(to::StocktakeStatusFinalised),
        from::RequisitionCreated => Some(to::RequisitionCreated),
        from::RequisitionDeleted => Some(to::RequisitionDeleted),
        from::RequisitionStatusSent => Some(to::RequisitionStatusSent),
        from::RequisitionStatusFinalised => Some(to::RequisitionStatusFinalised),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_activity_log_translation() {
        use crate::sync::test::test_data::activity_log as test_data;
        let translator = ActivityLogTranslation {};

        let (_, connection, _, _) =
            setup_all("test_activity_log_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
