use async_trait::async_trait;
use repository::{BarcodeProposalRowRepository, ChangelogRow, ChangelogTableName, KeyType};

use crate::{
    barcode::{ManageBarcodeError, SITES_TO_AUTO_CONFIRM, auto_confirm},
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};

#[cfg(test)]
mod test;

const DESCRIPTION: &str = "Confirm a barcode when enough sites propose it for the same item";

/// On central: when a store's barcode proposal arrives, confirms the barcode for
/// the item once [`SITES_TO_AUTO_CONFIRM`] sites have proposed it, onto the item's
/// auto-created variant, unless a packaging variant already has the barcode or
/// central removed it for the item (decisions/2026-09-30_barcodes.md). Idempotent — a re-run over the same
/// changelog entry is a no-op.
pub(crate) struct BarcodeAutoConfirmProcessor;

#[async_trait]
impl Processor for BarcodeAutoConfirmProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::BarcodeProposal]
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let Some(proposal) = BarcodeProposalRowRepository::new(&ctx.connection)
            .find_one_by_id(&changelog.record_id)?
        else {
            return Ok(None);
        };

        let confirmed = ctx
            .connection
            .transaction_sync(|connection| {
                auto_confirm(connection, &proposal.value, &proposal.item_id)
            })
            .map_err(|error| match error.to_inner_error() {
                ManageBarcodeError::DatabaseError(error) => ProcessorError::DatabaseError(error),
                error => ProcessorError::OtherError(format!("{error:?}")),
            })?;

        Ok(confirmed.map(|barcode| {
            format!(
                "barcode ({}) confirmed for item ({}) on packaging variant ({}) after {SITES_TO_AUTO_CONFIRM} sites proposed it",
                barcode.value(),
                barcode.item_variant.item_id,
                barcode.packaging_variant.id
            )
        }))
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::BarcodeAutoConfirmProcessorCursor)
    }
}
