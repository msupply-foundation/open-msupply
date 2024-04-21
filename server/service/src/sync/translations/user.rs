use serde::{Deserialize, Serialize};

use repository::{
    LanguageType, StorageConnection, SyncBufferRow, UserAccountRow, UserAccountRowRepository,
};

use crate::sync::sync_serde::empty_str_as_option_string;

use super::{PullTranslateResult, SyncTranslation};

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
        } = serde_json::from_str::<LegacyUserTable>(&sync_record.data)?;

        let user_account = UserAccountRowRepository::new(connection).find_one_by_id(&id)?;

        let (hashed_password, last_successful_sync) = match user_account {
            Some(user_account) => (
                user_account.hashed_password,
                user_account.last_successful_sync,
            ),
            None => ("".to_string(), None),
        };

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
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_user_translation() {
        use crate::sync::test::test_data::user as test_data;
        let translator = UserTranslation {};

        let (_, connection, _, _) =
            setup_all("test_user_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
