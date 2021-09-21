use crate::database::repository::{InvoiceLineRepository, RepositoryError};
use crate::database::schema::InvoiceLineRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InvoiceLineLoader {
    pub invoice_line_repository: InvoiceLineRepository,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineLoader {
    type Value = InvoiceLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .invoice_line_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|invoice_line: &InvoiceLineRow| {
                let invoice_line_id = invoice_line.id.clone();
                let invoice_line = invoice_line.clone();
                (invoice_line_id, invoice_line)
            })
            .collect())
    }
}
