use super::{PullTranslateResult, SyncTranslation};
use repository::{
    LanguageType, StorageConnection, SyncBufferRow, UserAccountRow, UserAccountRowRepository,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::empty_str_as_option_string;

#[derive(Deserialize, Serialize)]
pub struct LegacyUserTable {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "name")]
    pub username: String,
    #[serde(rename = "e_mail")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub email: Option<String>,
    #[serde(rename = "Language")]
    pub language: i32,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub first_name: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub last_name: Option<String>,
    #[serde(rename = "phone1")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub phone_number: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub job_title: Option<String>,
    #[serde(rename = "active")]
    #[serde(default = "default_true")]
    pub is_active: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub password_hash: Option<String>,
}

fn default_true() -> bool {
    true
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(UserTranslation)
}

pub(super) struct UserTranslation;
impl SyncTranslation for UserTranslation {
    fn table_name(&self) -> &str {
        "user"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        _fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyUserTable {
            id,
            username,
            email,
            language,
            first_name,
            last_name,
            phone_number,
            job_title,
            is_active,
            password_hash,
        } = sync_record.deserialize()?;

        let user_account = UserAccountRowRepository::new(connection).find_one_by_id(&id)?;

        // mSupply has no `deleted_datetime`, so a user deleted here stays deleted.
        let (hashed_password, last_successful_sync, deleted_datetime) = match user_account {
            Some(user_account) => (
                user_account.hashed_password,
                user_account.last_successful_sync,
                user_account.deleted_datetime,
            ),
            None => ("".to_string(), None, None),
        };

        let hashed_password = password_hash.map_or(hashed_password, |p| p);

        let result = UserAccountRow {
            id,
            username,
            email,
            language: user_language(language),
            first_name,
            last_name,
            phone_number,
            job_title,
            hashed_password,
            last_successful_sync,
            is_active,
            deleted_datetime,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

fn user_language(language: i32) -> LanguageType {
    match language {
        0 => LanguageType::English,
        1 => LanguageType::French,
        2 => LanguageType::Spanish,
        3 => LanguageType::Laos,
        4 => LanguageType::Khmer,
        5 => LanguageType::Portuguese,
        6 => LanguageType::Russian,
        7 => LanguageType::Tetum,
        _ => LanguageType::English,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::translations::IntegrationOperation;
    use repository::{ChangelogSyncType, mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_user_translation() {
        use crate::sync::test::test_data::user as test_data;
        let translator = UserTranslation {};

        let (_, connection, _, _) =
            setup_all("test_user_translation", MockDataInserts::none()).await;

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

    // covers: OMS-REG-CDIO-01.98

    #[actix_rt::test]
    async fn a_deleted_user_stays_deleted() {
        use crate::sync::test::test_data::user as test_data;
        let (_, connection, _, _) =
            setup_all("user_translation_keeps_deleted", MockDataInserts::none()).await;
        let record = test_data::test_pull_upsert_records()
            .remove(0)
            .sync_buffer_row;
        let pull = || {
            let PullTranslateResult::IntegrationOperations(operations) = UserTranslation
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record,
                )
                .unwrap()
            else {
                panic!("expected an upsert");
            };
            for operation in operations {
                let IntegrationOperation::Upsert(upsert) = operation else {
                    panic!("expected an upsert");
                };
                upsert
                    .upsert_sync(
                        &connection,
                        ChangelogSyncType::SyncTypeV5V6 {
                            source_site_id: None,
                        },
                    )
                    .unwrap();
            }
        };
        pull();

        let repo = UserAccountRowRepository::new(&connection);
        let deleted = UserAccountRow {
            deleted_datetime: chrono::NaiveDate::from_ymd_opt(2026, 1, 2)
                .unwrap()
                .and_hms_opt(3, 4, 5),
            ..repo.find_one_by_id(&record.record_id).unwrap().unwrap()
        };
        repo.upsert_one(&deleted).unwrap();

        pull();
        assert_eq!(
            repo.find_one_by_id(&record.record_id).unwrap(),
            Some(deleted)
        );
    }
}
