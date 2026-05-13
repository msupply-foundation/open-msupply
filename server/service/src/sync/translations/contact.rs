use crate::sync::translations::{name::NameTranslation, PullTranslateResult, SyncTranslation};
use repository::db_diesel::contact_row::ContactRowDelete;
use repository::{ContactRow, StorageConnection, SyncBufferRow};
use serde::Deserialize;
use util::sync_serde::empty_str_as_option_string;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyContactRow {
    ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    address1: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    address2: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    category: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    category2: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    category3: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    country: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    email: Option<String>,
    first: String,
    last: String,
    name_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    phone: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    position: Option<String>,
}

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ContactTranslation)
}

pub(super) struct ContactTranslation;
impl SyncTranslation for ContactTranslation {
    fn table_name(&self) -> &str {
        "contact"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![NameTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyContactRow>(&sync_record.data)?;
        let result = ContactRow {
            id: data.ID,
            name_id: data.name_ID,
            first_name: data.first,
            position: data.position,
            comment: data.comment,
            last_name: data.last,
            phone: data.phone,
            email: data.email,
            category_1: data.category,
            category_2: data.category2,
            category_3: data.category3,
            address_1: data.address1,
            address_2: data.address2,
            country: data.country,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ContactRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_contact_translation() {
        use crate::sync::test::test_data::contact as test_data;
        let translator = ContactTranslation {};

        let (_, connection, _, _) =
            setup_all("test_contact_translation", MockDataInserts::none()).await;

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
}
