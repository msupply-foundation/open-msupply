use async_graphql::*;
use chrono::Utc;
use domain::invoice::{InvoiceStatus, InvoiceType};
use service::dashboard::invoice_count::{
    CountTimeRange, InvoiceCountError, InvoiceCountService, InvoiceCountServiceTrait,
};

use crate::ContextExt;

fn do_invoice_count(
    ctx: &Context<'_>,
    invoice_type: &InvoiceType,
    invoice_status: &InvoiceStatus,
    range: &CountTimeRange,
    timezone_offset: &Option<i32>,
) -> Result<i64> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context().map_err(|_| Error {
        message: "InternalError".to_string(),
        source: None,
        extensions: None,
    })?;
    let service = InvoiceCountService {};
    let count = service
        .invoices_count(
            &service_ctx,
            invoice_type,
            invoice_status,
            range,
            &Utc::now(),
            timezone_offset,
        )
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

    Ok(count)
}

pub struct InvoiceCountsSummary {
    invoice_type: InvoiceType,
    invoice_status: InvoiceStatus,
    timezone_offset: Option<i32>,
}

#[Object]
impl InvoiceCountsSummary {
    async fn today(&self, ctx: &Context<'_>) -> Result<i64> {
        do_invoice_count(
            ctx,
            &self.invoice_type,
            &self.invoice_status,
            &CountTimeRange::Today,
            &self.timezone_offset,
        )
    }

    async fn this_week(&self, ctx: &Context<'_>) -> Result<i64> {
        do_invoice_count(
            ctx,
            &self.invoice_type,
            &self.invoice_status,
            &CountTimeRange::ThisWeek,
            &self.timezone_offset,
        )
    }
}

pub struct OutboundInvoiceCounts {
    timezone_offset: Option<i32>,
}

#[Object]
impl OutboundInvoiceCounts {
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::OutboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
        }
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
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::InboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
        }
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

pub fn invoice_counts(timezone_offset: Option<i32>) -> InvoiceCounts {
    InvoiceCounts { timezone_offset }
}
