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
    is_external: Option<bool>,
) -> Result<i64> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context(store_id.to_string(), "".to_string())?;
    let service = &service_provider.invoice_count_service;
    let count = match is_external {
        None => service
            .invoices_count(
                &service_ctx,
                store_id,
                invoice_type,
                invoice_status,
                range,
                &Utc::now(),
                timezone_offset,
            ),
        Some(is_external) => service
            .invoices_count_by_external(
                &service_ctx,
                store_id,
                invoice_type,
                invoice_status,
                range,
                &Utc::now(),
                timezone_offset,
                is_external,
            ),
    }
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
    is_external: Option<bool>,
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
            self.is_external,
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
            self.is_external,
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
            is_external: None,
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
    /// None = all inbound, Some(false) = internal only, Some(true) = external only
    is_external: Option<bool>,
}

#[Object]
impl InboundInvoiceCounts {
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::InboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: self.is_external,
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

        let not_delivered: i64 = match self.is_external {
            None => service
                .inbound_invoices_not_delivered_count(&service_ctx, &self.store_id),
            Some(is_external) => service
                .inbound_invoices_not_delivered_count_by_external(
                    &service_ctx,
                    &self.store_id,
                    is_external,
                ),
        }
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

    /// All inbound shipments (internal + external)
    async fn inbound(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: None,
        }
    }

    /// Internal inbound shipments only (no purchase order)
    async fn inbound_internal(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: Some(false),
        }
    }

    /// External inbound shipments only (linked to a purchase order)
    async fn inbound_external(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: Some(true),
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
