use async_graphql::*;
use chrono::Utc;
use domain::invoice::InvoiceType;
use service::dashboard::invoice_count::{
    InvoiceCountError, InvoiceCountService, InvoiceCountServiceTrait,
};

use crate::ContextExt;

// TODO could be split into today, this_week, etc.
fn created_summary(
    ctx: &Context<'_>,
    invoice_type: InvoiceType,
    timezone_offset: Option<i32>,
) -> Result<InvoiceCountsSummary> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context().map_err(|_| Error {
        message: "InternalError".to_string(),
        source: None,
        extensions: None,
    })?;
    let service = InvoiceCountService {};
    let created = service
        .created_invoices_count(&service_ctx, invoice_type, Utc::now(), timezone_offset)
        .map_err(|err| match err {
            InvoiceCountError::RepositoryError(_) => Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            },
            InvoiceCountError::BadTimezoneOffset => Error {
                message: "BadUserInput".to_string(),
                source: None,
                extensions: None,
            },
        })?;

    Ok(InvoiceCountsSummary {
        today: created.today,
        this_week: created.this_week,
    })
}

pub struct OutboundInvoiceCounts {
    timezone_offset: Option<i32>,
}

#[Object]
impl OutboundInvoiceCounts {
    async fn created(&self, ctx: &Context<'_>) -> Result<InvoiceCountsSummary> {
        created_summary(
            ctx,
            InvoiceType::OutboundShipment,
            self.timezone_offset.clone(),
        )
    }

    /// Number of outbound shipments ready to be picked
    async fn to_be_picked(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context().map_err(|_| Error {
            message: "InternalError".to_string(),
            source: None,
            extensions: None,
        })?;
        let service = InvoiceCountService {};
        let to_by_picked = service
            .outbound_invoices_pickable_count(&service_ctx)
            .map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;
        Ok(to_by_picked)
    }
}

pub struct InboundInvoiceCounts {
    timezone_offset: Option<i32>,
}

#[Object]
impl InboundInvoiceCounts {
    async fn created(&self, ctx: &Context<'_>) -> Result<InvoiceCountsSummary> {
        created_summary(
            ctx,
            InvoiceType::InboundShipment,
            self.timezone_offset.clone(),
        )
    }
}

pub struct InvoiceCounts {
    timezone_offset: Option<i32>,
}

#[Object]
impl InvoiceCounts {
    async fn outbound(&self) -> OutboundInvoiceCounts {
        OutboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
        }
    }

    async fn inbound(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
        }
    }
}

#[derive(SimpleObject)]
pub struct InvoiceCountsSummary {
    pub today: i64,
    pub this_week: i64,
}

pub fn invoice_counts(timezone_offset: Option<i32>) -> InvoiceCounts {
    InvoiceCounts { timezone_offset }
}
