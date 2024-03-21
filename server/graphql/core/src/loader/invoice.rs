use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::EqualFilter;
use repository::{
    Invoice, InvoiceFilter, InvoiceLineRepository, PricingRow, RepositoryError,
    StorageConnectionManager,
};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct InvoiceByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceByIdLoader {
    type Value = Invoice;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        invoice_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let filter = InvoiceFilter::new().id(EqualFilter::equal_any(
            invoice_ids.iter().map(String::clone).collect(),
        ));

        let invoices = self
            .service_provider
            .invoice_service
            .get_invoices(&service_context, None, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(invoices
            .rows
            .into_iter()
            .map(|invoice| (invoice.invoice_row.id.clone(), invoice))
            .collect())
    }
}

pub struct InvoiceStatsLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceStatsLoader {
    type Value = PricingRow;
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
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for InvoiceByRequisitionIdLoader {
    type Value = Vec<Invoice>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        requisition_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let filter = InvoiceFilter::new().requisition_id(EqualFilter::equal_any(
            requisition_ids.iter().map(String::clone).collect(),
        ));

        let invoices = self
            .service_provider
            .invoice_service
            .get_invoices(&service_context, None, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        let mut result: HashMap<String, Vec<Invoice>> = HashMap::new();
        for invoice in invoices.rows {
            if let Some(requisition_id) = &invoice.invoice_row.requisition_id {
                let list = result.entry(requisition_id.clone()).or_default();
                list.push(invoice);
            }
        }
        Ok(result)
    }
}
