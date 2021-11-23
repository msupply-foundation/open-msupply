use domain::invoice::InvoicePricing;
use repository::{
    schema::InvoiceLineRow, InvoiceLineQueryRepository, InvoiceLineRepository, RepositoryError,
    StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InvoiceLineLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineLoader {
    type Value = InvoiceLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)?
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
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineStatsLoader {
    type Value = InvoicePricing;
    type Error = RepositoryError;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineQueryRepository::new(&connection);
        Ok(repo
            .stats(invoice_ids)?
            .into_iter()
            .map(|stats| {
                (
                    stats.invoice_id.clone(),
                    InvoicePricing {
                        total_after_tax: stats.total_after_tax,
                    },
                )
            })
            .collect())
    }
}
