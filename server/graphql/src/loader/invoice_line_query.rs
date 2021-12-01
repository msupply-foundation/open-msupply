use async_graphql::dataloader::*;
use async_graphql::*;
use domain::{
    invoice_line::{InvoiceLine, InvoiceLineFilter},
    EqualFilter,
};
use repository::{InvoiceLineRepository, StorageConnectionManager};
use std::collections::HashMap;

use service::ListError;

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
