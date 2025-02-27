use repository::{
    ChangelogTableName, InvoiceRowRepository, InvoiceStatus, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::invoice::InvoiceTranslation;

use super::{invoice::LegacyTransactRow, PullTranslateResult, SyncTranslation};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(InvoiceCancellationTranslation)
}

pub(super) struct InvoiceCancellationTranslation;
impl SyncTranslation for InvoiceCancellationTranslation {
    fn table_name(&self) -> &str {
        "transact"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![InvoiceTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Invoice)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // Check linked (original) invoice and modify in-place if this record is
        // a cancellation invoice. In Legacy mSupply...
        let data = serde_json::from_str::<LegacyTransactRow>(&sync_record.data)?;

        if !data.is_cancellation {
            return Ok(PullTranslateResult::NotMatched);
        }

        let Some(linked_invoice_id) = data.linked_transaction_id else {
            return Ok(PullTranslateResult::NotMatched);
        };

        let repo = InvoiceRowRepository::new(connection);

        let original_invoice = repo.find_one_by_id(&linked_invoice_id)?;

        let Some(mut original_invoice) = original_invoice else {
            return Ok(PullTranslateResult::NotMatched);
        };

        if original_invoice.status == InvoiceStatus::Cancelled {
            return Ok(PullTranslateResult::NotMatched);
        }

        original_invoice.cancelled_datetime = data.created_datetime;
        original_invoice.status = InvoiceStatus::Cancelled;

        repo.upsert_one(&original_invoice)?;

        Ok(PullTranslateResult::NotMatched)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_invoice_cancellation_translation() {
        use crate::sync::test::test_data::invoice as test_data;
        let translator = InvoiceCancellationTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_invoice_cancellation_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert_eq!(
                translator.should_translate_from_sync_record(&record.sync_buffer_row),
                true
            );
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
