use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, InvoiceLineRepository};
use repository::{InvoiceLine, InvoiceLineFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use super::RequisitionAndItemId;

pub struct InvoiceLineByInvoiceIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for InvoiceLineByInvoiceIdLoader {
    type Value = Vec<InvoiceLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_provider = self.service_provider.clone();
        let invoice_ids = invoice_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<InvoiceLine>>, async_graphql::Error> {
                let service_context = service_provider.basic_context()?;
                let repo = InvoiceLineRepository::new(&service_context.connection);

                let invoice_lines = repo.query_by_filter(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(invoice_ids)),
                )?;

                let mut map: HashMap<String, Vec<InvoiceLine>> = HashMap::new();
                for line in invoice_lines {
                    let list = map
                        .entry(line.invoice_line_row.invoice_id.clone())
                        .or_default();
                    list.push(line);
                }
                Ok(map)
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}

pub struct InvoiceLineForRequisitionLine {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<RequisitionAndItemId> for InvoiceLineForRequisitionLine {
    type Value = Vec<InvoiceLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_id: &[RequisitionAndItemId],
    ) -> Result<HashMap<RequisitionAndItemId, Self::Value>, Self::Error> {
        let service_provider = self.service_provider.clone();
        let requisition_and_item_id = requisition_and_item_id.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<RequisitionAndItemId, Vec<InvoiceLine>>, async_graphql::Error> {
                let service_context = service_provider.basic_context()?;
                let repo = InvoiceLineRepository::new(&service_context.connection);

                let requisition_ids = util::dedup_iter(
                    requisition_and_item_id
                        .iter()
                        .map(|input| input.requisition_id.clone()),
                );
                let item_ids = util::dedup_iter(
                    requisition_and_item_id
                        .iter()
                        .map(|input| input.item_id.clone()),
                );

                let invoice_lines = repo.query_by_filter(
                    InvoiceLineFilter::new()
                        .requisition_id(EqualFilter::equal_any(requisition_ids))
                        .item_id(EqualFilter::equal_any(item_ids)),
                )?;

                let mut map = HashMap::new();
                for line in invoice_lines {
                    if let Some(requisition_id) = &line.invoice_row.requisition_id {
                        let list = map
                            .entry(RequisitionAndItemId::new(requisition_id, &line.item_row.id))
                            .or_insert_with(Vec::<InvoiceLine>::new);
                        list.push(line);
                    }
                }
                Ok(map)
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}
