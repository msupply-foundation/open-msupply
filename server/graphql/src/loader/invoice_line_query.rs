use async_graphql::dataloader::*;
use async_graphql::*;
use domain::{invoice_line::InvoiceLine, EqualFilter};
use repository::{InvoiceLineFilter, InvoiceLineRepository, StorageConnectionManager};
use std::collections::HashMap;

use service::ListError;

use crate::standard_graphql_error::StandardGraphqlError;

use super::{extract_unique_requisition_and_item_ids, RequisitionAndItemId};

pub struct InvoiceLineQueryLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineQueryLoader {
    type Value = Vec<InvoiceLine>;
    type Error = ListError;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineRepository::new(&connection);

        let all_invoice_lines = repo.query_by_filter(
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(invoice_ids.to_owned())),
        )?;

        // Put lines into a map grouped by invoice id:
        // invoice_id -> list of invoice_line for the invoice id
        let mut map: HashMap<String, Vec<InvoiceLine>> = HashMap::new();
        for line in all_invoice_lines {
            let list = map
                .entry(line.invoice_id.clone())
                .or_insert_with(|| Vec::<InvoiceLine>::new());
            list.push(line);
        }
        Ok(map)
    }
}

pub struct InvoiceLineForRequisitionLine {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<RequisitionAndItemId> for InvoiceLineForRequisitionLine {
    type Value = Vec<InvoiceLine>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_and_item_id: &[RequisitionAndItemId],
    ) -> Result<HashMap<RequisitionAndItemId, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineRepository::new(&connection);

        let (requisition_ids, item_ids) =
            extract_unique_requisition_and_item_ids(requisition_and_item_id);

        let all_invoice_lines = repo
            .query_by_filter(
                InvoiceLineFilter::new()
                    .requisition_id(EqualFilter::equal_any(requisition_ids))
                    .item_id(EqualFilter::equal_any(item_ids)),
            )
            .map_err(StandardGraphqlError::from_repository_error)?;

        let mut map: HashMap<RequisitionAndItemId, Vec<InvoiceLine>> = HashMap::new();
        for line in all_invoice_lines {
            if let Some(requisition_id) = &line.requisition_id {
                let list = map
                    .entry(RequisitionAndItemId {
                        item_id: line.item_id.clone(),
                        requisition_id: requisition_id.clone(),
                    })
                    .or_insert_with(|| Vec::<InvoiceLine>::new());
                list.push(line);
            }
        }
        Ok(map)
    }
}
