use async_graphql::*;
use graphql_core::{
    generic_filters::{
        DatetimeFilterInput, EqualFilterBigFloatingNumberInput, EqualFilterStringInput,
    },
    generic_inputs::{report_sort_to_typed_sort, PrintReportSortInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{list_error_to_gql_err, validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    DraftStockOutItemData, EqualFilterInvoiceStatusInput, EqualFilterInvoiceTypeInput,
    InvoiceLineConnector, InvoiceLineNodeType,
};
use repository::{
    DatetimeFilter, EqualFilter, InvoiceLineFilter, InvoiceLineSort, InvoiceLineSortField,
    InvoiceLineType, InvoiceStatus, InvoiceType, PaginationOption,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice_line::query::GetInvoiceLinesError,
};

#[derive(InputObject, Clone)]
pub struct EqualFilterInvoiceLineTypeInput {
    pub equal_to: Option<InvoiceLineNodeType>,
    pub equal_any: Option<Vec<InvoiceLineNodeType>>,
    pub not_equal_to: Option<InvoiceLineNodeType>,
    pub not_equal_all: Option<Vec<InvoiceLineNodeType>>,
}

#[derive(InputObject, Clone)]
pub struct InvoiceLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub invoice_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInvoiceLineTypeInput>,
    pub requisition_id: Option<EqualFilterStringInput>,
    pub number_of_packs: Option<EqualFilterBigFloatingNumberInput>,
    pub invoice_type: Option<EqualFilterInvoiceTypeInput>,
    pub invoice_status: Option<EqualFilterInvoiceStatusInput>,
    pub stock_line_id: Option<EqualFilterStringInput>,
    pub reason_option: Option<EqualFilterStringInput>,
    #[graphql(deprecation = "Since 2.8.0. Use reason_option")]
    pub inventory_adjustment_reason: Option<EqualFilterStringInput>,
    pub verified_datetime: Option<DatetimeFilterInput>,
    pub program_id: Option<EqualFilterStringInput>,
    pub is_program_invoice: Option<bool>,
}

impl From<InvoiceLineFilterInput> for InvoiceLineFilter {
    fn from(f: InvoiceLineFilterInput) -> Self {
        InvoiceLineFilter {
            id: f.id.map(EqualFilter::from),
            store_id: f.store_id.map(EqualFilter::from),
            invoice_id: f.invoice_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
            item_id: f.item_id.map(EqualFilter::from),
            r#type: f
                .r#type
                .map(|t| map_filter!(t, |r| InvoiceLineType::from(r))),
            requisition_id: f.requisition_id.map(EqualFilter::from),
            number_of_packs: f.number_of_packs.map(|t| map_filter!(t, f64::from)),
            invoice_type: f
                .invoice_type
                .map(|t| map_filter!(t, |i| InvoiceType::from(i))),
            invoice_status: f
                .invoice_status
                .map(|t| map_filter!(t, |i| InvoiceStatus::from(i))),
            stock_line_id: f.stock_line_id.map(EqualFilter::from),
            verified_datetime: f.verified_datetime.map(DatetimeFilter::from),
            reason_option: f
                .reason_option
                .map(EqualFilter::from)
                .or(f.inventory_adjustment_reason.map(EqualFilter::from)),
            program_id: f.program_id.map(EqualFilter::from),
            is_program_invoice: f.is_program_invoice,
            picked_datetime: None,
            delivered_datetime: None,
            has_prescribed_quantity: None,
            has_note: None,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, serde::Serialize, strum::EnumIter)]
#[serde(rename_all = "lowercase")]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::invoice_line::InvoiceLineSortField")]
pub enum InvoiceLineSortFieldInput {
    ItemCode,
    ItemName,
    /// Invoice line batch
    Batch,
    /// Invoice line expiry date
    ExpiryDate,
    /// Invoice line pack size
    PackSize,
    /// Invoice line item stock location name
    LocationName,
}

#[derive(InputObject)]
pub struct InvoiceLineSortInput {
    /// Sort query result by `key`
    pub key: InvoiceLineSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    pub desc: Option<bool>,
}

impl InvoiceLineSortInput {
    pub fn to_domain(self) -> InvoiceLineSort {
        InvoiceLineSort {
            key: InvoiceLineSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(Union)]
pub enum InvoiceLinesResponse {
    Response(InvoiceLineConnector),
}

pub fn invoice_lines(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<InvoiceLineFilterInput>,
    sort: Option<Vec<InvoiceLineSortInput>>,
    report_sort: Option<PrintReportSortInput>,
) -> Result<InvoiceLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context(store_id.to_string(), user.user_id)?;
    let service = &service_provider.invoice_line_service;

    let sort = report_sort_to_typed_sort(report_sort)
        .map(|(key, desc)| InvoiceLineSortInput { key, desc })
        .or_else(|| sort.and_then(|mut sort_list| sort_list.pop()));

    let invoice_lines = service.get_invoice_lines(
        &service_ctx,
        store_id,
        page.map(PaginationOption::from),
        filter.map(InvoiceLineFilter::from),
        sort.map(|s| s.to_domain()),
    );

    if let Ok(invoice_lines) = invoice_lines {
        Ok(InvoiceLinesResponse::Response(
            InvoiceLineConnector::from_domain(invoice_lines),
        ))
    } else {
        let err = invoice_lines.unwrap_err();
        let formatted_error = format!("{:#?}", err);
        let graphql_error = match err {
            GetInvoiceLinesError::DatabaseError(err) => err.into(),
            GetInvoiceLinesError::InvalidStore => {
                StandardGraphqlError::BadUserInput(formatted_error)
            }
            GetInvoiceLinesError::InvalidInvoice => {
                StandardGraphqlError::BadUserInput(formatted_error)
            }
            GetInvoiceLinesError::ListError(err) => return Err(list_error_to_gql_err(err)),
        };
        Err(graphql_error.extend())
    }
}

pub fn draft_outbound_lines(
    ctx: &Context<'_>,
    store_id: &str,
    item_id: &str,
    invoice_id: &str,
) -> Result<DraftStockOutItemData> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context(store_id.to_string(), user.user_id)?;
    let service = &service_provider.invoice_line_service;

    let result = service.get_draft_stock_out_lines(&service_ctx, store_id, item_id, invoice_id);

    if let Ok((draft_lines, item_data)) = result {
        Ok(DraftStockOutItemData {
            lines: draft_lines,
            placeholder_quantity: item_data.placeholder_quantity,
            prescribed_quantity: item_data.prescribed_quantity,
            note: item_data.note,
        })
    } else {
        let err = result.unwrap_err();
        let formatted_error = format!("{:#?}", err);
        log::error!("Draft outbound lines generation error: {}", formatted_error);
        Err(list_error_to_gql_err(err))
    }
}
