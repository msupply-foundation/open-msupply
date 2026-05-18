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

async fn do_invoice_count(
    ctx: &Context<'_>,
    invoice_type: InvoiceType,
    invoice_status: InvoiceStatus,
    range: CountTimeRange,
    timezone_offset: FixedOffset,
    store_id: String,
    is_external: Option<bool>,
) -> Result<i64> {
    let service_provider = ctx.service_provider_data();

    let count = tokio::task::spawn_blocking(move || -> Result<i64> {
        let service_ctx = service_provider
            .context(store_id.to_string(), "".to_string())
            .map_err(StandardGraphqlError::from_repository_error)?;
        let service = &service_provider.invoice_count_service;
        let result = match is_external {
            None => service.invoices_count(
                &service_ctx,
                &store_id,
                &invoice_type,
                &invoice_status,
                &range,
                &Utc::now(),
                &timezone_offset,
            ),
            Some(is_external) => service.invoices_count_by_external(
                &service_ctx,
                &store_id,
                &invoice_type,
                &invoice_status,
                &range,
                &Utc::now(),
                &timezone_offset,
                is_external,
            ),
        };
        result.map_err(|err| {
            match err {
                InvoiceCountError::RepositoryError(err) => StandardGraphqlError::from(err),
                InvoiceCountError::BadTimezoneOffset => {
                    StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string())
                }
            }
            .extend()
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

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
            self.invoice_type.clone(),
            self.invoice_status.clone(),
            CountTimeRange::Today,
            self.timezone_offset,
            self.store_id.clone(),
            self.is_external,
        )
        .await
    }

    async fn this_week(&self, ctx: &Context<'_>) -> Result<i64> {
        do_invoice_count(
            ctx,
            self.invoice_type.clone(),
            self.invoice_status.clone(),
            CountTimeRange::ThisWeek,
            self.timezone_offset,
            self.store_id.clone(),
            self.is_external,
        )
        .await
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
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();

        let not_shipped = tokio::task::spawn_blocking(move || -> Result<i64> {
            let service_ctx = service_provider.basic_context().map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;
            let service = &service_provider.invoice_count_service;
            service
                .outbound_invoices_not_shipped_count(&service_ctx, &store_id)
                .map_err(|_| Error {
                    message: "InternalError".to_string(),
                    source: None,
                    extensions: None,
                })
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)??;
        Ok(not_shipped)
    }
}

pub struct InboundInvoiceCounts {
    timezone_offset: FixedOffset,
    store_id: String,
    is_external: bool,
}

#[Object]
impl InboundInvoiceCounts {
    async fn created(&self) -> InvoiceCountsSummary {
        InvoiceCountsSummary {
            invoice_type: InvoiceType::InboundShipment,
            invoice_status: InvoiceStatus::New,
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: Some(self.is_external),
        }
    }

    async fn not_delivered(&self, ctx: &Context<'_>) -> Result<i64> {
        let service_provider = ctx.service_provider_data();
        let store_id = self.store_id.clone();
        let is_external = self.is_external;

        let not_delivered = tokio::task::spawn_blocking(move || -> Result<i64> {
            let service_ctx = service_provider.basic_context().map_err(|_| Error {
                message: "InternalError".to_string(),
                source: None,
                extensions: None,
            })?;
            let service = &service_provider.invoice_count_service;
            service
                .inbound_invoices_not_delivered_count_by_external(
                    &service_ctx,
                    &store_id,
                    is_external,
                )
                .map_err(|_| Error {
                    message: "InternalError".to_string(),
                    source: None,
                    extensions: None,
                })
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)??;

        Ok(not_delivered)
    }
}

fn parse_timezone(timezone_offset: &Option<i32>) -> Result<FixedOffset> {
    offset_to_timezone(timezone_offset).ok_or(
        StandardGraphqlError::BadUserInput("Invalid timezone offset".to_string()).extend(),
    )
}

pub fn outbound_shipment_counts(
    ctx: &Context<'_>,
    store_id: String,
    timezone_offset: Option<i32>,
) -> Result<OutboundInvoiceCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryOutboundShipment,
            store_id: Some(store_id.clone()),
        },
    )?;

    let timezone_offset = parse_timezone(&timezone_offset)?;
    Ok(OutboundInvoiceCounts {
        timezone_offset,
        store_id,
    })
}

pub fn inbound_shipment_counts(
    ctx: &Context<'_>,
    store_id: String,
    timezone_offset: Option<i32>,
) -> Result<InboundInvoiceCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInboundShipment,
            store_id: Some(store_id.clone()),
        },
    )?;

    let timezone_offset = parse_timezone(&timezone_offset)?;
    Ok(InboundInvoiceCounts {
        timezone_offset,
        store_id,
        is_external: false,
    })
}

pub fn inbound_shipment_external_counts(
    ctx: &Context<'_>,
    store_id: String,
    timezone_offset: Option<i32>,
) -> Result<InboundInvoiceCounts> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInboundShipmentExternal,
            store_id: Some(store_id.clone()),
        },
    )?;

    let timezone_offset = parse_timezone(&timezone_offset)?;
    Ok(InboundInvoiceCounts {
        timezone_offset,
        store_id,
        is_external: true,
    })
}

// --- Deprecated combined query ---

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

    /// Internal inbound shipments only (no purchase order)
    async fn inbound(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: false,
        }
    }

    /// External inbound shipments only (linked to a purchase order)
    async fn inbound_external(&self) -> InboundInvoiceCounts {
        InboundInvoiceCounts {
            timezone_offset: self.timezone_offset,
            store_id: self.store_id.clone(),
            is_external: true,
        }
    }
}

#[deprecated(note = "Use outbound_shipment_counts, inbound_shipment_counts, or inbound_shipment_external_counts instead")]
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

    let timezone_offset = parse_timezone(&timezone_offset)?;
    Ok(InvoiceCounts {
        timezone_offset,
        store_id,
    })
}
