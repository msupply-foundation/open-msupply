use domain::invoice::{Invoice, InvoiceFilter};
use domain::EqualFilter;
use repository::schema::InvoiceStatsRow;
use repository::{
    schema::InvoiceRow, InvoiceRepository, RepositoryError, StorageConnectionManager,
};
use repository::{InvoiceLineRepository, InvoiceQueryRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use service::invoice::get_invoices;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

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

pub struct InvoiceQueryLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceQueryLoader {
    type Value = Invoice;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = InvoiceQueryRepository::new(&connection);
        Ok(repo
            .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_any(keys.to_owned())))?
            .into_iter()
            .map(|invoice| (invoice.id.clone(), invoice))
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

pub struct InvoiceByRequisitionIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceByRequisitionIdLoader {
    type Value = Vec<Invoice>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let filter = InvoiceFilter::new().requisition_id(EqualFilter::equal_any(
            requisition_ids.iter().map(String::clone).collect(),
        ));

        let invoices = get_invoices(&self.connection_manager, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, Vec<Invoice>> = HashMap::new();
        for invoice in invoices.rows {
            if let Some(requisition_id) = &invoice.requisition_id {
                let list = result
                    .entry(requisition_id.clone())
                    .or_insert_with(|| Vec::<Invoice>::new());
                list.push(invoice);
            }
        }
        Ok(result)
    }
}
