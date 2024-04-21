use async_graphql::*;
use chrono::{FixedOffset, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{InvoiceStatus, InvoiceType};
use service::{
    auth::{Resource, ResourceAccessRequest},
    dashboard::invoice_count::{CountTimeRange, InvoiceCountError},
};
use util::timezone::offset_to_timezone;

fn do_invoice_count(
    ctx: &Context<'_>,
    invoice_type: &InvoiceType,
    invoice_status: &InvoiceStatus,
    range: &CountTimeRange,
    timezone_offset: &FixedOffset,
    store_id: &str,
) -> Result<i64> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context(store_id.to_string(), "".to_string())?;
    let service = &service_provider.invoice_count_service;
    let count = service
        .invoices_count(
            &service_ctx,
            store_id,
            invoice_type,
            invoice_status,
            range,
            &Utc::now(),
            timezone_offset,
        )
        .map_err(|err| match err {
            InvoiceCountError::RepositoryError(err) => StandardGraphqlError::from(err),
            InvoiceCountError::BadTimezoneOffset => {
                StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string())
            }
        })?;

    Ok(count)
}

pub struct InvoiceCountsSummary {
    invoice_type: InvoiceType,
    invoice_status: InvoiceStatus,
    timezone_offset: FixedOffset,
    store_id: String,
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
            &self.store_id,
        )
    }

    async fn this_week(&self, ctx: &Context<'_>) -> Result<i64> {
        do_invoice_count(
            ctx,
            &self.invoice_type,
            &self.invoice_status,
            &CountTimeRange::ThisWeek,
            &self.timezone_offset,
            &self.store_id,
        )
    }
}

pub struct OutboundInvoiceCounts {
    timezone_offset: FixedOffset,
    store_id: String,
}

#[Object]
impl OutboundInvoiceCounts {
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::OutboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
    }

    /// Number of outbound shipments not shipped yet
    async fn not_shipped(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context().map_err(|_| Error {
            message: "InternalError".to_string(),
            source: None,
            extensions: None,
        })?;
        let service = &service_provider.invoice_count_service;
        let not_shipped: i64 = service
            .outbound_invoices_not_shipped_count(&service_ctx, &self.store_id)
            .map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;
        Ok(not_shipped)
    }
}

pub struct InboundInvoiceCounts {
    timezone_offset: FixedOffset,
    store_id: String,
}

#[Object]
impl InboundInvoiceCounts {
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::InboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
    }

    async fn not_delivered(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context().map_err(|_| Error {
            message: "InternalError".to_string(),
            source: None,
            extensions: None,
        })?;
        let service = &service_provider.invoice_count_service;

        let not_delivered: i64 = service
            .inbound_invoices_not_delivered_count(&service_ctx, &self.store_id)
            .map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;

        Ok(not_delivered)
    }
}

pub struct InvoiceCounts {
    timezone_offset: FixedOffset,
    store_id: String,
}

#[Object]
impl InvoiceCounts {
    async fn outbound(&self) -> OutboundInvoiceCounts {
        OutboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
    }

    async fn inbound(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
    }
}

pub fn invoice_counts(
    ctx: &Context<'_>,
    store_id: String,
    timezone_offset: Option<i32>,
) -> Result<InvoiceCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::InvoiceCount,
            store_id: Some(store_id.clone()),
        },
    )?;

    let timezone_offset = offset_to_timezone(&timezone_offset).ok_or(
        StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string()),
    )?;
    Ok(InvoiceCounts {
        timezone_offset,
        store_id,
    })
}
