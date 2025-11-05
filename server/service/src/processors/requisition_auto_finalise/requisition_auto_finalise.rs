use std::collections::HashMap;

use async_trait::async_trait;
use repository::{
    ChangelogFilter, ChangelogRow, ChangelogTableName, EqualFilter, InvoiceFilter,
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRepository,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, KeyType, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, RequisitionStatus, RequisitionType,
};
use util::constants::SYSTEM_USER_ID;

use crate::{
    cursor_controller::CursorType,
    preference::{Preference, RequisitionAutoFinalise},
    processors::general_processor::{Processor, ProcessorError},
    requisition::response_requisition::{
        update_response_requisition, UpdateResponseRequisition, UpdateResponseRequisitionStatus,
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::ActiveStoresOnSite,
};

pub(crate) struct RequisitionAutoFinaliseProcessor;

#[async_trait]
impl Processor for RequisitionAutoFinaliseProcessor {
    fn get_description(&self) -> String {
        "Automatically finalises requisitions according to store preference".to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let connection = &ctx.connection;
        let store_id = changelog
            .store_id
            .clone()
            .ok_or(ProcessorError::OtherError(
                "Changelog filter should have ensured a store_id".to_string(),
            ))?;

        let should_auto_finalise = RequisitionAutoFinalise {}
            .load(connection, Some(store_id))
            .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

        if !should_auto_finalise {
            return Ok(None);
        }

        let invoice_row_repo = InvoiceRowRepository::new(connection);
        let invoice = invoice_row_repo
            .find_one_by_id(&changelog.record_id)?
            .ok_or(ProcessorError::RecordNotFound(
                "Invoice".to_string(),
                changelog.record_id.clone(),
            ))?;

        if invoice.r#type != InvoiceType::OutboundShipment {
            return Ok(None);
        }

        let Some(requisition_id) = invoice.requisition_id else {
            return Ok(None);
        };

        // Only process invoices that are in a Shipped or Verified status
        if invoice.status != InvoiceStatus::Shipped && invoice.status != InvoiceStatus::Verified {
            return Ok(None);
        }

        let requisition_row_repo = RequisitionRowRepository::new(connection);
        let requisition = requisition_row_repo
            .find_one_by_id(&requisition_id)?
            .ok_or(ProcessorError::RecordNotFound(
                "Requisition".to_string(),
                changelog.record_id.clone(),
            ))?;

        if requisition.r#type != RequisitionType::Response {
            return Ok(None);
        }

        if requisition.status == RequisitionStatus::Finalised {
            return Ok(None);
        }

        let invoices = InvoiceRepository::new(connection).query_by_filter(
            InvoiceFilter::new().requisition_id(EqualFilter::equal_to(requisition.id.to_string())),
        )?;

        let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition.id.to_string())),
        )?;
        if requisition_lines.len() == 0 {
            return Ok(None);
        }

        let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_any(
                    invoices.into_iter().map(|i| i.invoice_row.id).collect(),
                ))
                .r#type(EqualFilter {
                    equal_to: Some(InvoiceLineType::StockOut),
                    ..Default::default()
                }),
        )?;
        if invoice_lines.len() == 0 {
            return Ok(None);
        }

        let mut invoice_line_item_units: HashMap<String, f64> = HashMap::new();
        invoice_lines
            .iter()
            .filter_map(|il| match il.invoice_row.status {
                // Only want statuses after the goods have left the warehouse and the invoice is no longer editable
                InvoiceStatus::New | InvoiceStatus::Allocated | InvoiceStatus::Picked => None,
                InvoiceStatus::Shipped
                | InvoiceStatus::Received
                | InvoiceStatus::Delivered
                | InvoiceStatus::Verified
                | InvoiceStatus::Cancelled => Some(il),
            })
            .for_each(|il| {
                let units = il.invoice_line_row.number_of_packs * il.invoice_line_row.pack_size;
                invoice_line_item_units
                    .entry(il.item_row.id.to_string())
                    .and_modify(|v| *v += units)
                    .or_insert(units);
            });

        let should_finalise = requisition_lines.iter().all(|rl| {
            if rl.requisition_line_row.requested_quantity <= 0.0 {
                return true;
            }
            invoice_line_item_units
                .get(&rl.item_row.id)
                .is_some_and(|v| *v >= rl.requisition_line_row.requested_quantity)
        });

        if !should_finalise {
            return Ok(None);
        }

        let store_ctx =
            service_provider.context(requisition.store_id, SYSTEM_USER_ID.to_string())?;
        update_response_requisition(
            &store_ctx,
            UpdateResponseRequisition {
                id: requisition.id.to_string(),
                status: Some(UpdateResponseRequisitionStatus::Finalised),
                ..Default::default()
            },
        )
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

        Ok(Some(format!(
            "requisition ({}) auto finalised",
            requisition.id
        )))
    }

    fn changelogs_filter(&self, ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        let active_stores = ActiveStoresOnSite::get(&ctx.connection)
            .map_err(ProcessorError::GetActiveStoresOnSiteError)?;

        let filter = ChangelogFilter::new()
            .table_name(EqualFilter {
                equal_to: Some(ChangelogTableName::Invoice),
                ..Default::default()
            })
            .store_id(EqualFilter::equal_any(active_stores.store_ids()));

        Ok(filter)
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::RequisitionAutoFinaliseProcessorCursor)
    }
}
