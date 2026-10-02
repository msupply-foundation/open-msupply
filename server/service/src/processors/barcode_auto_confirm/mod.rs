use async_trait::async_trait;
use repository::{BarcodeProposalRowRepository, ChangelogRow, ChangelogTableName, KeyType};

use crate::{
    barcode::{auto_confirm, SITES_TO_AUTO_CONFIRM},
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};

#[cfg(test)]
mod test;

const DESCRIPTION: &str = "Confirm a barcode when enough sites propose it for the same item";

/// On central: when a store's barcode proposal arrives, confirms the barcode for
/// the item once [`SITES_TO_AUTO_CONFIRM`] sites have proposed it, unless central
/// has already confirmed something for the barcode or removed it for the item
/// (decisions/2026-09-30_barcodes.md). Idempotent — a re-run over the same
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
            .map_err(|error| ProcessorError::DatabaseError(error.to_inner_error()))?;

        Ok(confirmed.map(|barcode| {
            format!(
                "barcode ({}) confirmed for item ({}) after {SITES_TO_AUTO_CONFIRM} sites proposed it",
                barcode.value, barcode.item_id
            )
        }))
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::BarcodeAutoConfirmProcessorCursor)
    }
}
