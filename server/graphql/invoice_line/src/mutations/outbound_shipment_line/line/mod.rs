use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::get_stock_line_response;
use graphql_types::types::InvoiceLineNode;

use graphql_types::types::StockLineResponse;

pub mod delete;
pub mod insert;
pub mod update;

pub struct StockLineDoesNotBelongToCurrentStore;
#[Object]
impl StockLineDoesNotBelongToCurrentStore {
    pub async fn description(&self) -> &str {
        "Stock line does not belong to current store"
    }
}

pub struct StockLineAlreadyExistsInInvoice(pub String);
#[Object]
impl StockLineAlreadyExistsInInvoice {
    pub async fn description(&self) -> &str {
        "Stock line is already reference by an invoice line of this invoice"
    }

    pub async fn line(&self, ctx: &Context<'_>) -> Result<InvoiceLineNode> {
        let service_provider = ctx.service_provider_data();
        let id = self.0.clone();

        let invoice_line =
            tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
                let service_context = service_provider.basic_context()?;
                service_provider
                    .invoice_line_service
                    .get_invoice_line(&service_context, &id)
            })
            .await
            .map_err(StandardGraphqlError::from_join_error)??
            .ok_or_else(|| {
                StandardGraphqlError::InternalError(format!("cannot get invoice_line {}", &self.0))
            })?;

        Ok(InvoiceLineNode::from_domain(invoice_line))
    }
}

pub struct StockLineIsOnHold;
#[Object]
impl StockLineIsOnHold {
    pub async fn description(&self) -> &str {
        "Cannot issue from stock line that is on hold"
    }
}

pub struct LocationIsOnHold;
#[Object]
impl LocationIsOnHold {
    pub async fn description(&self) -> &str {
        "Cannot issue from on hold location"
    }
}

pub struct LocationNotFound;
#[Object]
impl LocationNotFound {
    pub async fn description(&self) -> &str {
        "Location linked to current batch is not found"
    }
}

pub struct NotEnoughStockForReduction {
    pub stock_line_id: String,
    pub line_id: Option<String>,
}

#[Object]
impl NotEnoughStockForReduction {
    pub async fn description(&self) -> &str {
        "Not enough stock for reduction"
    }

    pub async fn line(&self, ctx: &Context<'_>) -> Result<Option<InvoiceLineNode>> {
        let invoice_line_id = match &self.line_id {
            Some(invoice_line_id) => invoice_line_id.to_string(),
            None => return Ok(None),
        };

        let service_provider = ctx.service_provider_data();
        let invoice_line_id_for_closure = invoice_line_id.clone();

        let invoice_line =
            tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
                let service_context = service_provider.basic_context()?;
                service_provider
                    .invoice_line_service
                    .get_invoice_line(&service_context, &invoice_line_id_for_closure)
            })
            .await
            .map_err(StandardGraphqlError::from_join_error)??
            .ok_or_else(|| {
                StandardGraphqlError::InternalError(format!(
                    "cannot get invoice_line {}",
                    &invoice_line_id
                ))
            })?;

        Ok(Some(InvoiceLineNode::from_domain(invoice_line)))
    }

    pub async fn batch(&self, ctx: &Context<'_>) -> Result<StockLineResponse> {
        let service_provider = ctx.service_provider_data();
        let stock_line_id = self.stock_line_id.clone();

        tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
            let service_context = service_provider.basic_context()?;
            Ok(get_stock_line_response(&service_context, stock_line_id))
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(async_graphql::Error::from)
    }
}

pub struct LineDoesNotReferenceStockLine;
#[Object]
impl LineDoesNotReferenceStockLine {
    pub async fn description(&self) -> &str {
        "Internal Error, line does not reference stock line"
    }
}

pub struct ItemDoesNotMatchStockLine;
#[Object]
impl ItemDoesNotMatchStockLine {
    pub async fn description(&self) -> &str {
        "Item does not match stock line"
    }
}
