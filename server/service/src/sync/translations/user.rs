use serde::{Deserialize, Serialize};

use repository::{
    Language, StorageConnection, SyncBufferRow, UserAccountRow, UserAccountRowRepository,
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
            None => ("".to_string(), chrono::Utc::now().naive_utc()),
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

fn user_language(language: i32) -> Language {
    match language {
        0 => Language::English,
        1 => Language::French,
        2 => Language::Spanish,
        3 => Language::Laos,
        4 => Language::Khmer,
        5 => Language::Portuguese,
        6 => Language::Russian,
        7 => Language::Tetum,
        _ => Language::English,
    }
}
