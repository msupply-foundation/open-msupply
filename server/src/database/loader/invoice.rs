use crate::database::repository::{InvoiceRepository, RepositoryError};
use crate::database::schema::InvoiceRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InvoiceLoader {
    pub invoice_repository: InvoiceRepository,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLoader {
    type Value = InvoiceRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .invoice_repository
            .find_many_by_id(keys)
            .await
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
