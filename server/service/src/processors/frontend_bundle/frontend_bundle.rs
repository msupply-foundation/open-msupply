use async_trait::async_trait;
use repository::{ChangelogRow, ChangelogTableName, KeyType};

use crate::{
    cursor_controller::CursorType,
    frontend_bundle::{best_usable_bundle, request_bundle_download},
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

const DESCRIPTION: &str = "Request download of the newest usable front-end bundle";

/// Queues the newest usable front-end bundle's bytes for background download as soon as a
/// bundle record changes.
///
/// This is a **promptness** trigger, not the mechanism. The same request is made by
/// [`crate::frontend_bundle::reconcile_active_bundle`], which runs at startup and after
/// every download pass, and that is what actually guarantees it happens.
///
/// The distinction matters: a changelog trigger fires once. A bundle record and its file
/// reference are separate changelog rows, and although central writes them in one
/// transaction they can land in different pull batches. If the reference arrives in the
/// later batch, this processor has already run and advanced its cursor, and no further
/// bundle-record change will ever arrive to react to — so on its own it would leave the
/// bundle permanently un-downloaded. Reconcile is the backstop that closes that.
pub(crate) struct RequestFrontendBundleDownload;

#[async_trait]
impl Processor for RequestFrontendBundleDownload {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        // Re-evaluate on any bundle change, whatever it was. A publish adds a candidate;
        // a withdrawal removes one and may make an older bundle the best again; a delete
        // does the same. Reading the current state is simpler and more robust than
        // reasoning from the individual change — and this runs rarely.
        if changelog.table_name != ChangelogTableName::FrontendBundle {
            return Ok(None);
        }

        let Some(best) = best_usable_bundle(&ctx.connection)? else {
            return Ok(Some("No usable bundle for this server version".to_string()));
        };

        let requested = request_bundle_download(ctx, &best)?;

        Ok(Some(if requested {
            format!(
                "Requested download of bundle {} (for server {})",
                best.version, best.server_version
            )
        } else {
            // Not a failure: reconcile will pick it up once the reference lands.
            format!(
                "Bundle {} has no file reference yet; reconcile will request it",
                best.version
            )
        }))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::FrontendBundle]
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::FrontendBundleProcessorCursor)
    }
}
