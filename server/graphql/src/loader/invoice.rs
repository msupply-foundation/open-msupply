use repository::schema::InvoiceStatsRow;
use repository::InvoiceLineRepository;
use repository::{
    schema::InvoiceRow, InvoiceRepository, RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InvoiceLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLoader {
    type Value = InvoiceRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)
            .unwrap()
            .iter()
            .map(|invoice: &InvoiceRow| {
                let invoice_id = invoice.id.clone();
                let invoice = invoice.clone();
                (invoice_id, invoice)
            })
            .collect())
    }
}

pub struct InvoiceStatsLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceStatsLoader {
    type Value = InvoiceStatsRow;
    type Error = RepositoryError;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineRepository::new(&connection);
        let result = repo
            .stats(invoice_ids)?
            .into_iter()
            .map(|row| {
                let invoice_id = row.invoice_id.clone();
                (invoice_id, row)
            })
            .collect();
        Ok(result)
    }
}
