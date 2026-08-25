use async_trait::async_trait;
use chrono::Utc;
use repository::{
    ActivityLogType, ChangelogCondition, ChangelogRow, ChangelogTableName, FilterBuilder,
    InvoiceRowRepository, InvoiceStatus, KeyType, PrescriptionOrderRow,
    PrescriptionOrderRowRepository, PrescriptionOrderStatus,
};

use crate::{
    activity_log::system_activity_log_entry,
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::ActiveStoresOnSite,
};

const DESCRIPTION: &str =
    "Set a prescription order to Dispensed when its generated dispensation is verified";

pub(crate) struct PrescriptionOrderStatusProcessor;

#[async_trait]
impl Processor for PrescriptionOrderStatusProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Watches invoice changelog entries: when a dispensing invoice generated
    /// from a prescription order (invoice.prescription_order_id set) reaches
    /// Verified, flip the order to Dispensed. Idempotent — a re-run over the
    /// same changelog entry is a no-op.
    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        // A delete changelog can point at a gone invoice — nothing to do
        let Some(invoice) =
            InvoiceRowRepository::new(&ctx.connection).find_one_by_id(&changelog.record_id)?
        else {
            return Ok(None);
        };

        let Some(prescription_order_id) = invoice.prescription_order_id.clone() else {
            return Ok(None);
        };
        if invoice.status != InvoiceStatus::Verified {
            return Ok(None);
        }

        let order_repo = PrescriptionOrderRowRepository::new(&ctx.connection);
        // The order should exist wherever this invoice's store is active, but
        // be lenient rather than blocking the processor queue
        let Some(order) = order_repo.find_one_by_id(&prescription_order_id)? else {
            return Ok(None);
        };
        if order.status == PrescriptionOrderStatus::Dispensed {
            return Ok(None);
        }

        let updated = PrescriptionOrderRow {
            status: PrescriptionOrderStatus::Dispensed,
            dispensed_datetime: Some(
                invoice
                    .verified_datetime
                    .unwrap_or_else(|| Utc::now().naive_utc()),
            ),
            ..order.clone()
        };
        order_repo.upsert_one(&updated)?;

        system_activity_log_entry(
            &ctx.connection,
            ActivityLogType::PrescriptionOrderDispensed,
            &updated.store_id,
            &updated.id,
        )?;

        Ok(Some(format!(
            "prescription order ({}) set to Dispensed by verified dispensation ({})",
            updated.id, invoice.id
        )))
    }

    async fn changelogs_filter(
        &self,
        ctx: &ServiceContext,
    ) -> Result<ChangelogCondition::Inner, ProcessorError> {
        let active_stores = ActiveStoresOnSite::get(&ctx.connection)
            .map_err(ProcessorError::GetActiveStoresOnSiteError)?;

        // Only invoices belonging to stores on this site can reference a
        // (remote-owned) prescription order held here
        Ok(ChangelogCondition::And(vec![
            ChangelogCondition::table_name::equal(ChangelogTableName::Invoice),
            ChangelogCondition::store_id::any(active_stores.store_ids()),
        ]))
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::PrescriptionOrderStatusProcessorCursor)
    }
}
