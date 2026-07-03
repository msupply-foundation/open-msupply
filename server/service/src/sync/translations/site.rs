use super::serde_utils::deserialize_sync_version;
use super::{to_legacy_time, PullTranslateResult, SyncTranslation};
use crate::sync::translations::PushTranslateResult;
use crate::sync::CentralServerConfig;
use chrono::{NaiveDate, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, Row, SiteRow, SiteRowDelete, SiteRowRepository,
    StorageConnection, SyncBufferRow, SyncVersion,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{date_from_date_time, date_option_to_isostring, empty_str_as_option_string};

#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct LegacySitePullRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "site_ID")]
    pub site_id: i32,
    pub name: String,
    #[serde(rename = "password_hash")]
    pub hashed_password: String,
    #[serde(rename = "hardwareID", deserialize_with = "empty_str_as_option_string")]
    pub hardware_id: Option<String>,
    pub code: Option<String>,
    /// 4D site.sync_version is a free-text field; "v7" upgrades the site,
    /// anything else (including empty) is treated as v5/v6.
    #[serde(default, deserialize_with = "deserialize_sync_version")]
    pub(crate) sync_version: SyncVersion,
}

#[derive(Serialize, Debug)]
pub struct LegacySitePushRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "hardwareID")]
    pub hardware_id: Option<String>,
    // Sync metadata authored on this OMS central server from v7 activity (#11784),
    // pushed up so legacy 4D's site table stays accurate now that v7 remotes sync
    // here rather than directly to 4D. 4D stores each timestamp as a separate date
    // + time-of-day column (field names match 4D's `site` record). Times are sent
    // as strings on push — 4D parses time strings when posting, see
    // `util::sync_serde::naive_time`.
    pub app_name: Option<String>,
    pub app_version: Option<String>,
    #[serde(serialize_with = "date_option_to_isostring")]
    pub last_connection_date: Option<NaiveDate>,
    pub last_connection_time: Option<NaiveTime>,
    #[serde(serialize_with = "date_option_to_isostring")]
    pub last_sync_date: Option<NaiveDate>,
    pub last_sync_time: Option<NaiveTime>,
    #[serde(serialize_with = "date_option_to_isostring")]
    pub first_sync_date: Option<NaiveDate>,
    pub first_sync_time: Option<NaiveTime>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(SiteTranslation)
}

pub(super) struct SiteTranslation;

impl SyncTranslation for SiteTranslation {
    fn table_name(&self) -> &str {
        "site"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Site)
    }

    fn should_translate_from_sync_record(&self, row: &SyncBufferRow) -> bool {
        // Site rows are only integrated on the central server
        row.table_name == self.table_name() && CentralServerConfig::is_central_server()
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        con: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_value::<LegacySitePullRow>(sync_record.data.0.clone())?;

        // Token and the sync-metadata fields are authored on the OMS central server
        // (token on auth; the metadata from v7 sync activity, #11784) — not by legacy
        // 4D. Preserve any existing local values so a routine site push-down (e.g. a
        // name/code change) doesn't wipe them.
        let existing = SiteRowRepository::new(con).find_one_by_id(data.site_id)?;
        let is_multi_device = existing
            .as_ref()
            .map(|row| row.is_multi_device)
            .unwrap_or(false);

        let result = SiteRow {
            id: data.site_id,
            og_id: Some(data.id),
            name: data.name,
            hashed_password: data.hashed_password,
            hardware_id: data.hardware_id,
            is_multi_device,
            code: data.code.unwrap_or_default(),
            token: existing.as_ref().and_then(|row| row.token.clone()),
            sync_version: data.sync_version,
            app_name: existing.as_ref().and_then(|row| row.app_name.clone()),
            app_version: existing.as_ref().and_then(|row| row.app_version.clone()),
            last_connection_datetime: existing
                .as_ref()
                .and_then(|row| row.last_connection_datetime),
            last_sync_datetime: existing.as_ref().and_then(|row| row.last_sync_datetime),
            first_sync_datetime: existing.as_ref().and_then(|row| row.first_sync_datetime),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::Site(site_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        // OG identifies sites by their UUID `ID`, which OMS stores as `og_id`.
        // A site without an `og_id` has no OG counterpart, so nothing to push.
        let Some(og_id) = site_row.og_id else {
            return Ok(PushTranslateResult::Ignored(format!(
                "Site {} has no og_id; skipping legacy push",
                site_row.id
            )));
        };

        let result = LegacySitePushRow {
            id: og_id.clone(),
            hardware_id: site_row.hardware_id,
            app_name: site_row.app_name,
            app_version: site_row.app_version,
            last_connection_date: site_row
                .last_connection_datetime
                .map(|dt| date_from_date_time(&dt)),
            last_connection_time: site_row.last_connection_datetime.map(to_legacy_time),
            last_sync_date: site_row
                .last_sync_datetime
                .map(|dt| date_from_date_time(&dt)),
            last_sync_time: site_row.last_sync_datetime.map(to_legacy_time),
            first_sync_date: site_row
                .first_sync_datetime
                .map(|dt| date_from_date_time(&dt)),
            first_sync_time: site_row.first_sync_datetime.map(to_legacy_time),
        };

        Ok(PushTranslateResult::upsert_with_record_id(
            changelog,
            self.table_name(),
            og_id,
            serde_json::to_value(result)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(SiteRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::test_util_set_is_central_server;
    use crate::sync::translations::PushSyncRecord;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogTableName, RowActionType,
    };

    #[actix_rt::test]
    async fn test_site_translation() {
        use crate::sync::test::test_data::site as test_data;
        let translator = SiteTranslation {};

        let (_, connection, _, _) =
            setup_all("test_site_translation", MockDataInserts::none()).await;

        // Should not translate on non-central sites
        test_util_set_is_central_server(false);
        for record in test_data::test_pull_upsert_records() {
            assert!(!translator.should_translate_from_sync_record(&record.sync_buffer_row));
        }

        test_util_set_is_central_server(true);

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

    fn site_changelog() -> ChangelogRow {
        ChangelogRow {
            cursor: 1,
            table_name: ChangelogTableName::Site,
            // Local i32 site_id stringified — what the changelog naturally stores.
            record_id: "2".to_string(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        }
    }

    fn site_row(og_id: Option<String>, hardware_id: Option<String>) -> SiteRow {
        SiteRow {
            id: 2,
            og_id,
            name: "Site B".to_string(),
            code: "code2".to_string(),
            hashed_password: "hash".to_string(),
            hardware_id,
            is_multi_device: false,
            token: None,
            sync_version: SyncVersion::V5V6,
            ..Default::default()
        }
    }

    fn push_record(result: PushTranslateResult) -> PushSyncRecord {
        match result {
            PushTranslateResult::PushRecord(mut records) => {
                assert_eq!(records.len(), 1);
                records.remove(0)
            }
            PushTranslateResult::Ignored(msg) => {
                panic!("expected PushRecord, got Ignored: {}", msg)
            }
            PushTranslateResult::NotMatched => panic!("expected PushRecord, got NotMatched"),
        }
    }

    #[actix_rt::test]
    async fn test_site_push_translation_wires_og_id_and_cleared_hardware_id() {
        let (_, connection, _, _) = setup_all(
            "test_site_push_translation_wires_og_id_and_cleared_hardware_id",
            MockDataInserts::none(),
        )
        .await;

        let translator = SiteTranslation {};
        let og_uuid = "37B585140A84469983B3FD8CDF0C39C5".to_string();

        let result = translator
            .try_translate_to_upsert_sync_record(
                &connection,
                &site_changelog(),
                Row::Site(site_row(Some(og_uuid.clone()), None)),
            )
            .unwrap();

        let record = push_record(result);
        // Wire recordId must be OG's UUID (from og_id), not the local i32 site_id.
        assert_eq!(record.record.record_id, og_uuid);
        assert_eq!(record.record.record_data["ID"], og_uuid);
        assert!(record.record.record_data["hardwareID"].is_null());
    }

    #[actix_rt::test]
    async fn test_site_push_translation_skips_when_no_og_id() {
        let (_, connection, _, _) = setup_all(
            "test_site_push_translation_skips_when_no_og_id",
            MockDataInserts::none(),
        )
        .await;

        let translator = SiteTranslation {};

        let result = translator
            .try_translate_to_upsert_sync_record(
                &connection,
                &site_changelog(),
                Row::Site(site_row(None, Some("hw-1".to_string()))),
            )
            .unwrap();

        assert!(
            matches!(result, PushTranslateResult::Ignored(_)),
            "expected Ignored when og_id is missing"
        );
    }

    #[actix_rt::test]
    async fn test_site_push_translation_serialises_sync_metadata() {
        use chrono::NaiveDate;

        let (_, connection, _, _) = setup_all(
            "test_site_push_translation_serialises_sync_metadata",
            MockDataInserts::none(),
        )
        .await;

        let translator = SiteTranslation {};
        let og_uuid = "37B585140A84469983B3FD8CDF0C39C5".to_string();

        let last_sync = NaiveDate::from_ymd_opt(2024, 12, 12)
            .unwrap()
            .and_hms_opt(16, 3, 22)
            .unwrap();

        let mut site = site_row(Some(og_uuid.clone()), Some("hw-9".to_string()));
        site.app_name = Some("Open mSupply Desktop".to_string());
        site.app_version = Some("2.19.00".to_string());
        site.last_sync_datetime = Some(last_sync);

        let result = translator
            .try_translate_to_upsert_sync_record(&connection, &site_changelog(), Row::Site(site))
            .unwrap();

        let record = push_record(result);
        let data = &record.record.record_data;
        assert_eq!(data["app_name"], "Open mSupply Desktop");
        assert_eq!(data["app_version"], "2.19.00");
        // Date is serialised as an ISO datetime, time-of-day as a string (4D parses
        // time strings on push). Unset timestamps serialise as null.
        assert_eq!(data["last_sync_date"], "2024-12-12T00:00:00");
        assert_eq!(data["last_sync_time"], "16:03:22");
        assert!(data["first_sync_date"].is_null());
        assert!(data["last_connection_date"].is_null());
    }

    #[actix_rt::test]
    async fn test_site_pull_translation_preserves_local_sync_metadata() {
        use crate::sync::test::test_data::site as test_data;
        use chrono::NaiveDate;

        let (_, connection, _, _) = setup_all(
            "test_site_pull_translation_preserves_local_sync_metadata",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);

        // Seed an existing local site (id 1, matching SITE_1) with token + metadata
        // that OMS central owns; a routine 4D push-down must not wipe them.
        let metadata_dt = NaiveDate::from_ymd_opt(2025, 1, 2)
            .unwrap()
            .and_hms_opt(3, 4, 5)
            .unwrap();
        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                id: 1,
                token: Some("local-token".to_string()),
                app_name: Some("Open mSupply Desktop".to_string()),
                app_version: Some("3.00.00".to_string()),
                last_connection_datetime: Some(metadata_dt),
                last_sync_datetime: Some(metadata_dt),
                first_sync_datetime: Some(metadata_dt),
                sync_version: SyncVersion::V7,
                ..Default::default()
            })
            .unwrap();

        let translator = SiteTranslation {};
        let record = test_data::test_pull_upsert_records().remove(0); // SITE_1 (site_id 1)
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
            .unwrap();

        // Identity fields come from 4D (incl. sync_version), but token + metadata
        // are preserved from the existing local row.
        let expected = SiteRow {
            id: 1,
            og_id: Some("1".to_string()),
            name: "Site A".to_string(),
            hashed_password: "hash_a".to_string(),
            hardware_id: Some("hw-uuid-aaa".to_string()),
            code: "code1".to_string(),
            is_multi_device: false,
            token: Some("local-token".to_string()),
            sync_version: SyncVersion::V5V6,
            app_name: Some("Open mSupply Desktop".to_string()),
            app_version: Some("3.00.00".to_string()),
            last_connection_datetime: Some(metadata_dt),
            last_sync_datetime: Some(metadata_dt),
            first_sync_datetime: Some(metadata_dt),
            ..Default::default()
        };
        assert_eq!(result, PullTranslateResult::upsert(expected));
    }
}
