use async_trait::async_trait;
use repository::{
    ActivityLogType, ChangelogFilter, ChangelogRow, ChangelogTableName, EqualFilter, InvoiceRow,
    InvoiceRowRepository, InvoiceType, KeyType, NumberRowType,
};

use crate::{
    activity_log::system_activity_log_entry,
    cursor_controller::CursorType,
    number::next_number,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::ActiveStoresOnSite,
};

const DESCRIPTION: &str = "Assign prescription number to a prescription";

pub(crate) struct AssignPrescriptionNumber;

#[async_trait]
impl Processor for AssignPrescriptionNumber {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Prescriptions synced from legacy mSupply (e.g. created via the FHIR/Tamanu integration)
    /// can arrive with an invoice_number of -1 if the legacy remote site never allocated a serial
    /// number before the store was migrated to OMS. This processor allocates a real number to them.
    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let repo = InvoiceRowRepository::new(&ctx.connection);

        let invoice =
            repo.find_one_by_id(&changelog.record_id)?
                .ok_or(ProcessorError::RecordNotFound(
                    "Invoice".to_string(),
                    changelog.record_id.clone(),
                ))?;

        // Only assign prescription number to prescriptions
        if invoice.r#type != InvoiceType::Prescription {
            return Ok(None);
        }

        // Only assign prescription number where not assigned already
        if invoice.invoice_number != -1 {
            return Ok(None);
        }

        let updated_invoice_row = InvoiceRow {
            invoice_number: next_number(
                &ctx.connection,
                &NumberRowType::Prescription,
                &invoice.store_id,
            )?,
            ..invoice.clone()
        };

        repo.upsert_one(&updated_invoice_row)?;
        system_activity_log_entry(
            &ctx.connection,
            ActivityLogType::InvoiceNumberAllocated,
            &updated_invoice_row.store_id,
            &updated_invoice_row.id,
        )?;

        let result = format!(
            "invoice ({}) allocated invoice_number {}",
            updated_invoice_row.id, updated_invoice_row.invoice_number
        );

        Ok(Some(result))
    }

    async fn changelogs_filter(
        &self,
        ctx: &ServiceContext,
    ) -> Result<ChangelogFilter, ProcessorError> {
        let active_stores = ActiveStoresOnSite::get(&ctx.connection)
            .map_err(ProcessorError::GetActiveStoresOnSiteError)?;

        // Only assign prescription number to prescriptions that belong to stores on this site
        let filter = ChangelogFilter::new()
            .table_name(EqualFilter {
                equal_to: Some(ChangelogTableName::Invoice),
                ..Default::default()
            })
            .store_id(EqualFilter::equal_any(active_stores.store_ids()));

        Ok(filter)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::AssignPrescriptionNumberProcessorCursor)
    }
}
