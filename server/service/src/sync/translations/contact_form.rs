use repository::{
    contact_form_row::{ContactFormRow, ContactFormRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{store::StoreTranslation, user::UserTranslation};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translations()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ContactFormTranslation)
}

pub(crate) struct ContactFormTranslation;

impl SyncTranslation for ContactFormTranslation {
    fn table_name(&self) -> &'static str {
        "contact_form"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![UserTranslation.table_name(), StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            ContactFormRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::ContactForm)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = ContactFormRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Contact Form row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, translations::ToSyncRecordTranslationType,
    };
    use repository::{
        contact_form_row::ContactFormRow,
        mock::{mock_contact_form_a, MockData, MockDataInserts},
        test_db::{setup_all, setup_all_with_data},
        RowActionType,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_contact_form_translation() {
        use crate::sync::test::test_data::contact_form as test_data;
        let translator = ContactFormTranslation;

        let (_, connection, _, _) =
            setup_all("test_contact_form_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_try_translate_to_upsert_sync_record() {
        let (mock_data, connection, _, _) = setup_all_with_data(
            "test_contact_form_push_merged",
            MockDataInserts::all(),
            MockData {
                contact_form: vec![ContactFormRow {
                    id: mock_contact_form_a().id,
                    reply_email: mock_contact_form_a().reply_email,
                    body: mock_contact_form_a().body,
                    created_datetime: mock_contact_form_a().created_datetime,
                    user_id: mock_contact_form_a().user_id,
                    store_id: mock_contact_form_a().store_id,
                    contact_type: mock_contact_form_a().contact_type,
                }],
                ..Default::default()
            },
        )
        .await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let changelog = ChangelogRow {
            cursor: 1,
            table_name: ChangelogTableName::ContactForm,
            record_id: "contact_id".to_string(),
            row_action: RowActionType::Upsert,
            name_id: None,
            store_id: None,
            is_sync_update: false,
            source_site_id: None,
        };

        let translator = ContactFormTranslation {};
        assert!(translator.should_translate_to_sync_record(
            &changelog,
            &ToSyncRecordTranslationType::PushToOmSupplyCentral
        ));
        let translated = translator
            .try_translate_to_upsert_sync_record(&connection, &changelog)
            .unwrap();

        assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

        let PushTranslateResult::PushRecord(translated) = translated else {
            panic!("Test fail, should translate")
        };

        assert_eq!(
            translated[0].record.record_data["user_id"],
            json!("user_account_a")
        );
    }
}
