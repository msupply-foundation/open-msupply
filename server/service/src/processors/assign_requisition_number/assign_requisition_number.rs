use async_trait::async_trait;
use repository::{
    ChangelogFilter, ChangelogRow, ChangelogTableName, EqualFilter, KeyType, NumberRowType,
    RequisitionRow, RequisitionRowRepository, RequisitionType,
};

use crate::{
    cursor_controller::CursorType,
    number::next_number,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::ActiveStoresOnSite,
};

const DESCRIPTION: &str = "Assign requisition number to a response requisition";

pub(crate) struct AssignRequisitionNumber;

#[async_trait]
impl Processor for AssignRequisitionNumber {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let repo = RequisitionRowRepository::new(&ctx.connection);

        let requisition =
            repo.find_one_by_id(&changelog.record_id)?
                .ok_or(ProcessorError::RecordNotFound(
                    "Requisition".to_string(),
                    changelog.record_id.clone(),
                ))?;

        // Only assign requisition number to response requisitions
        if requisition.r#type != RequisitionType::Response {
            return Ok(None);
        }

        // Only assign requisition number where not assigned already
        if requisition.requisition_number != -1 {
            return Ok(None);
        }

        let updated_requisition_row = RequisitionRow {
            requisition_number: next_number(
                &ctx.connection,
                &NumberRowType::ResponseRequisition,
                &requisition.store_id,
            )?,
            ..requisition.clone()
        };

        repo.upsert_one(&updated_requisition_row)?;

        let result = format!(
            "requisition ({}) allocated requisition_number {}",
            updated_requisition_row.id, updated_requisition_row.requisition_number
        );

        Ok(Some(result))
    }

    fn changelogs_filter(&self, ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        let active_stores = ActiveStoresOnSite::get(&ctx.connection, None)
            .map_err(ProcessorError::GetActiveStoresOnSiteError)?;

        // Only assign requisition number to response requisitions if they belong to stores on this site
        let filter = ChangelogFilter::new()
            .table_name(EqualFilter {
                equal_to: Some(ChangelogTableName::Requisition),
                ..Default::default()
            })
            .store_id(EqualFilter::equal_any(active_stores.store_ids()));

        Ok(filter)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::AssignRequisitionNumberProcessorCursor)
    }
}
