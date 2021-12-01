use domain::invoice::InvoicePricing;
use domain::invoice_line::{InvoiceLine, InvoiceLineFilter};
use domain::EqualFilter;
use repository::{InvoiceLineRepository, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct InvoiceLineLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceLineLoader {
    type Value = InvoiceLine;
    type Error = RepositoryError;

    async fn load(
        &self,
        invoice_line_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceLineRepository::new(&connection);

        let result = repo
            .query_by_filter(
                InvoiceLineFilter::new().id(EqualFilter::equal_any(invoice_line_ids.to_owned())),
            )?
            .into_iter()
            .map(|invoice_line| (invoice_line.id.clone(), invoice_line))
            .collect();

        Ok(result)
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
        let repo = InvoiceLineRepository::new(&connection);
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
