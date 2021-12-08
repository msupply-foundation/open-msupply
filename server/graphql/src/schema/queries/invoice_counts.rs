use async_graphql::*;
use chrono::Utc;
use service::dashboard::invoice_count::{InvoiceCountService, InvoiceCountServiceTrait};

use crate::schema::types::invoice_query::InvoiceNodeType;
use crate::ContextExt;

#[derive(SimpleObject)]
pub struct InvoiceCounts {
    created: InvoiceCountsSummary,
}

#[derive(SimpleObject)]
pub struct InvoiceCountsSummary {
    pub today: i64,
    pub this_week: i64,
}

#[derive(Union)]
pub enum InvoiceCountsResponse {
    Response(InvoiceCounts),
}

pub fn invoice_counts(
    ctx: &Context<'_>,
    invoice_type: InvoiceNodeType,
    timezone_offset: Option<i32>,
) -> Result<InvoiceCountsResponse> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context().map_err(|_| Error {
        message: "InternalError".to_string(),
        source: None,
        extensions: None,
    })?;
    let service = InvoiceCountService {};
    let created = service
        .created_invoices_count(
            &service_ctx,
            invoice_type.into(),
            Utc::now(),
            timezone_offset,
        )
        .map_err(|err| match err {
            service::dashboard::invoice_count::InvoiceCountError::RepositoryError(_) => Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            },
            service::dashboard::invoice_count::InvoiceCountError::BadTimezoneOffset => Error {
                message: "BadUserInput".to_string(),
                source: None,
                extensions: None,
            },
        })?;

    Ok(InvoiceCountsResponse::Response(InvoiceCounts {
        created: InvoiceCountsSummary {
            today: created.today,
            this_week: created.this_week,
        },
    }))
}
