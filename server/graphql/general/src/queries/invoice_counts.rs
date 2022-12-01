use async_graphql::*;
use chrono::{FixedOffset, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{InvoiceRowStatus, InvoiceRowType};
use service::{
    auth::{Resource, ResourceAccessRequest},
    dashboard::invoice_count::{CountTimeRange, InvoiceCountError},
};
use util::timezone::offset_to_timezone;

fn do_invoice_count(
    ctx: &Context<'_>,
    invoice_type: &InvoiceRowType,
    invoice_status: &InvoiceRowStatus,
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
    invoice_type: InvoiceRowType,
    invoice_status: InvoiceRowStatus,
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
            invoice_type: InvoiceRowType::OutboundShipment,
            invoice_status: InvoiceRowStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
    }

    /// Number of outbound shipments ready to be picked
    async fn to_be_picked(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context().map_err(|_| Error {
            message: "InternalError".to_string(),
            source: None,
            extensions: None,
        })?;
        let service = &service_provider.invoice_count_service;
        let to_by_picked = service
            .outbound_invoices_pickable_count(&service_ctx, &self.store_id)
            .map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;
        Ok(to_by_picked)
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
            invoice_type: InvoiceRowType::InboundShipment,
            invoice_status: InvoiceRowStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
        }
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
            timezone_offset: self.timezone_offset.clone(),
            store_id: self.store_id.clone(),
        }
    }

    async fn inbound(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset.clone(),
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
