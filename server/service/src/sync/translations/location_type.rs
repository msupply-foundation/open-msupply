use repository::{
    ChangelogTableName, LocationTypeRow, LocationTypeRowRepository, RepositoryError,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyLocationTypeRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "Description")]
    pub description: String,
    #[serde(rename = "Temperature_min")]
    pub temperature_min: f64,
    #[serde(rename = "Temperature_max")]
    pub temperature_max: f64,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(LocationTypeTranslation)
}

/// The code a location type arriving from legacy central takes: its name, or
/// that name suffixed where another type already holds it. Legacy central sends
/// no code, so one has to be derived — on the same rule the v3.04.00 migration
/// used for the rows that predate the column, or a site that received its types
/// by sync would hold duplicates where an upgraded site would not.
///
/// Per-record, so it cannot see the whole set the migration could: a duplicate
/// arriving before the type whose real name is the suffixed one takes that
/// suffix first, and the later arrival is pushed along. Codes stay unique on
/// the site either way; they are not guaranteed to match another site's, which
/// v7 makes moot by carrying the code itself.
fn unique_code(
    connection: &StorageConnection,
    name: &str,
    id: &str,
) -> Result<String, RepositoryError> {
    let repo = LocationTypeRowRepository::new(connection);
    if !repo.code_is_taken(name, id)? {
        return Ok(name.to_string());
    }
    let mut suffix = 2;
    loop {
        let candidate = format!("{name}_{suffix}");
        if !repo.code_is_taken(&candidate, id)? {
            return Ok(candidate);
        }
        suffix += 1;
    }
}

pub(super) struct LocationTypeTranslation;
impl SyncTranslation for LocationTypeTranslation {
    fn table_name(&self) -> &str {
        "Location_type"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        None // Not editable in OMS
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        _fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyLocationTypeRow {
            id,
            description,
            temperature_min,
            temperature_max,
        } = sync_record.deserialize()?;

        // A code already assigned is kept, so a rename does not move it.
        let code = match LocationTypeRowRepository::new(connection).find_one_by_id(&id)? {
            Some(existing) if !existing.code.is_empty() => existing.code,
            _ => unique_code(connection, &description, &id)?,
        };

        let result = LocationTypeRow {
            id,
            name: description,
            min_temperature: temperature_min,
            max_temperature: temperature_max,
            code,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn location_type_translation() {
        use crate::sync::test::test_data::location_type as test_data;
        let translator = LocationTypeTranslation {};

        let (_, connection, _, _) =
            setup_all("location_type_translation", MockDataInserts::none()).await;

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
    }

    fn incoming(id: &str, description: &str) -> SyncBufferRow {
        SyncBufferRow {
            table_name: "Location_type".to_string(),
            record_id: id.to_string(),
            data: repository::SyncRecordData(serde_json::json!({
                "ID": id,
                "Description": description,
                "Temperature_min": 2.0,
                "Temperature_max": 8.0,
            })),
            action: repository::SyncAction::Upsert,
            ..Default::default()
        }
    }

    /// Translates one incoming record and stores what it produced, the way the
    /// integration step does — the next record has to see it.
    async fn pull(connection: &StorageConnection, id: &str, description: &str) -> LocationTypeRow {
        let translated = LocationTypeTranslation
            .try_translate_from_upsert_sync_record(
                connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming(id, description),
            )
            .unwrap();
        let PullTranslateResult::IntegrationOperations(operations) = translated else {
            panic!("expected an upsert for {id}");
        };
        for operation in operations {
            let crate::sync::translations::IntegrationOperation::Upsert(upsert) = operation else {
                panic!("expected an upsert for {id}");
            };
            upsert
                .upsert_sync(
                    connection,
                    repository::ChangelogSyncType::SyncTypeV5V6 {
                        source_site_id: None,
                    },
                )
                .expect("failed to store the translated row");
        }
        LocationTypeRowRepository::new(connection)
            .find_one_by_id(id)
            .unwrap()
            .unwrap()
    }

    /// Legacy central sends no code, so the translator derives one. Two types of
    /// one name must not end up sharing it — the v3.04.00 migration suffixes
    /// them for rows that predate the column, and a site that received the same
    /// types by sync has to land in the same shape.
    #[actix_rt::test]
    async fn a_duplicate_name_is_given_its_own_code() {
        let (_, connection, _, _) = setup_all(
            "location_type_duplicate_name_is_given_its_own_code",
            MockDataInserts::none(),
        )
        .await;

        assert_eq!(
            pull(&connection, "lt1", "Cold_Room").await.code,
            "Cold_Room"
        );
        assert_eq!(
            pull(&connection, "lt2", "Cold_Room").await.code,
            "Cold_Room_2"
        );
        assert_eq!(
            pull(&connection, "lt3", "Cold_Room").await.code,
            "Cold_Room_3"
        );
        // A different name is untouched by the suffixing.
        assert_eq!(pull(&connection, "lt4", "Freezer").await.code, "Freezer");
    }

    /// The suffix a real name already holds is not handed to a duplicate.
    #[actix_rt::test]
    async fn a_name_that_looks_like_a_suffix_keeps_its_own_code() {
        let (_, connection, _, _) = setup_all(
            "location_type_name_that_looks_like_a_suffix",
            MockDataInserts::none(),
        )
        .await;

        pull(&connection, "lt1", "Cold_Room").await;
        pull(&connection, "lt2", "Cold_Room_2").await;
        assert_eq!(
            pull(&connection, "lt3", "Cold_Room").await.code,
            "Cold_Room_3"
        );
    }

    /// A code, once assigned, is the type's own: renaming it upstream leaves the
    /// code alone, and re-sending the record does not suffix it against itself.
    #[actix_rt::test]
    async fn a_rename_leaves_the_code_where_it_was() {
        let (_, connection, _, _) = setup_all(
            "location_type_rename_leaves_the_code",
            MockDataInserts::none(),
        )
        .await;

        assert_eq!(
            pull(&connection, "lt1", "Cold_Room").await.code,
            "Cold_Room"
        );

        let renamed = pull(&connection, "lt1", "Chiller").await;
        assert_eq!(renamed.name, "Chiller");
        assert_eq!(renamed.code, "Cold_Room");

        // The code it kept is still taken, so a type that now carries that
        // name does NOT get it — the retained code wins over the live name.
        assert_eq!(
            pull(&connection, "lt2", "Cold_Room").await.code,
            "Cold_Room_2"
        );
    }
}
