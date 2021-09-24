use crate::database::repository::{InvoiceLineRepository, InvoiceQueryRepository, RepositoryError};
use crate::database::schema::{InvoiceLineRow, InvoiceLineStatsRow};

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

pub struct InvoiceLineStatsLoader {
    pub invoice_query_repository: InvoiceQueryRepository,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineStatsLoader {
    type Value = InvoiceLineStatsRow;
    type Error = RepositoryError;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .invoice_query_repository
            .stats(invoice_ids)
            .await?
            .into_iter()
            .map(|stats| (stats.invoice_id.clone(), stats))
            .collect())
    }
}
