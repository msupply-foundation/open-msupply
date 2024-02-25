use async_graphql::*;
use graphql_core::{
    generic_filters::{
        DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterStringInput, StringFilterInput,
    },
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{InvoiceConnector, InvoiceNode, InvoiceNodeStatus, InvoiceNodeType};
use repository::{
    DatetimeFilter, EqualFilter, Invoice, InvoiceFilter, InvoiceLineRow, InvoiceLineRowRepository,
    InvoiceRepository, InvoiceRow, InvoiceRowRepository, InvoiceSort, InvoiceSortField,
    PaginationOption, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum InvoiceResponse {
    Error(NodeError),
    Response(InvoiceNode),
}

#[derive(Union)]
pub enum InvoicesResponse {
    Response(InvoiceConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum InvoiceSortFieldInput {
    Type,
    OtherPartyName,
    InvoiceNumber,
    Comment,
    Status,
    CreatedDatetime,
    AllocatedDatetime,
    PickedDatetime,
    ShippedDatetime,
    DeliveredDatetime,
    VerifiedDatetime,
    TheirReference,
    TransportReference,
}

#[derive(InputObject)]
pub struct InvoiceSortInput {
    /// Sort query result by `key`
    key: InvoiceSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterInvoiceTypeInput {
    pub equal_to: Option<InvoiceNodeType>,
    pub equal_any: Option<Vec<InvoiceNodeType>>,
    pub not_equal_to: Option<InvoiceNodeType>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterInvoiceStatusInput {
    pub equal_to: Option<InvoiceNodeStatus>,
    pub equal_any: Option<Vec<InvoiceNodeStatus>>,
    pub not_equal_to: Option<InvoiceNodeStatus>,
}

#[derive(InputObject, Clone)]
pub struct InvoiceFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name_id: Option<EqualFilterStringInput>,
    pub invoice_number: Option<EqualFilterBigNumberInput>,
    pub other_party_name: Option<StringFilterInput>,
    pub other_party_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub user_id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInvoiceTypeInput>,
    pub status: Option<EqualFilterInvoiceStatusInput>,
    pub on_hold: Option<bool>,
    pub comment: Option<StringFilterInput>,
    pub their_reference: Option<EqualFilterStringInput>,
    pub transport_reference: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub allocated_datetime: Option<DatetimeFilterInput>,
    pub picked_datetime: Option<DatetimeFilterInput>,
    pub shipped_datetime: Option<DatetimeFilterInput>,
    pub delivered_datetime: Option<DatetimeFilterInput>,
    pub verified_datetime: Option<DatetimeFilterInput>,
    pub colour: Option<EqualFilterStringInput>,
    pub requisition_id: Option<EqualFilterStringInput>,
    pub linked_invoice_id: Option<EqualFilterStringInput>,
}

pub fn get_invoice(
    ctx: &Context<'_>,
    store_id: Option<String>,
    id: &str,
) -> Result<InvoiceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInvoice,
            store_id: store_id.clone(),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context =
        service_provider.context(store_id.clone().unwrap_or("".to_string()), user.user_id)?;
    let invoice_service = &service_provider.invoice_service;

    let invoice_option = invoice_service.get_invoice(&service_context, store_id.as_deref(), id)?;

    let response = match invoice_option {
        Some(invoice) => InvoiceResponse::Response(InvoiceNode::from_domain(invoice)),
        None => InvoiceResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}

pub fn get_invoices(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<InvoiceFilterInput>,
    sort: Option<Vec<InvoiceSortInput>>,
) -> Result<InvoicesResponse> {
    if let Some(inv_type) = filter.clone().map(|filter| {
        filter
            .r#type
            .map(|t| t.equal_to)
            .flatten()
            .unwrap_or_else(|| InvoiceNodeType::InboundShipment) // ..default to something that isn't a return
    }) {
        if let Some(invoice) = inbound_return(ctx, &inv_type) {
            return Ok(InvoicesResponse::Response(InvoiceConnector::from_vec(
                vec![invoice],
            )));
        }
    };

    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInvoice,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let invoices = service_provider
        .invoice_service
        .get_invoices(
            &service_context,
            Some(&store_id),
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(InvoicesResponse::Response(InvoiceConnector::from_domain(
        invoices,
    )))
}

fn inbound_return(ctx: &Context<'_>, r#type: &InvoiceNodeType) -> Option<Invoice> {
    if *r#type != InvoiceNodeType::InboundReturn {
        return None;
    }

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context().unwrap();

    InvoiceRowRepository::new(&context.connection)
        .upsert_one(&InvoiceRow {
            id: "inbound_return_1".to_string(),
            name_link_id: "8251E89A4B7E6D47AFA01E2805C7DDAD".to_string(),
            name_store_id: Some("0AF30FF38285394284E5701F005BAD58".to_string()),
            store_id: "D77F67339BF8400886D009178F4962E1".to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            invoice_number: 3,
            ..Default::default()
        })
        .unwrap();

    InvoiceLineRowRepository::new(&context.connection)
        .upsert_one(&InvoiceLineRow {
            id: "inbound_return_line1".to_string(),
            invoice_id: "inbound_return_1".to_string(),
            item_link_id: "E43D125F51DE4355AE1233DA449ED08A".to_string(),
            item_name: "Amoxicillin 250mg tabs".to_string(),
            item_code: "030453".to_string(),
            stock_line_id: Some("68118a4f-1f4a-4469-ba35-1f30e2b1bb77".to_string()),
            pack_size: 20,
            number_of_packs: 1000.0,
            ..Default::default()
        })
        .unwrap();

    Some(
        InvoiceRepository::new(&context.connection)
            .query_one(InvoiceFilter::by_id("inbound_return_1"))
            .unwrap()
            .unwrap(),
    )
}

pub fn get_invoice_by_number(
    ctx: &Context<'_>,
    store_id: String,
    invoice_number: u32,
    r#type: InvoiceNodeType,
) -> Result<InvoiceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInvoice,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    let invoice_service = &service_provider.invoice_service;

    let invoice_option = invoice_service.get_invoice_by_number(
        &service_context,
        &store_id,
        invoice_number,
        r#type.to_domain(),
    )?;

    let response = match invoice_option {
        Some(invoice) => InvoiceResponse::Response(InvoiceNode::from_domain(invoice)),
        None => InvoiceResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}

impl InvoiceFilterInput {
    pub fn to_domain(self) -> InvoiceFilter {
        InvoiceFilter {
            id: self.id.map(EqualFilter::from),
            invoice_number: self.invoice_number.map(EqualFilter::from),
            name_id: self.other_party_id.map(EqualFilter::from),
            name: self.other_party_name.map(StringFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
            user_id: self.user_id.map(EqualFilter::from),
            r#type: self
                .r#type
                .map(|t| map_filter!(t, InvoiceNodeType::to_domain)),
            status: self
                .status
                .map(|t| map_filter!(t, InvoiceNodeStatus::to_domain)),
            on_hold: self.on_hold,
            comment: self.comment.map(StringFilter::from),
            their_reference: self.their_reference.map(EqualFilter::from),
            transport_reference: self.transport_reference.map(EqualFilter::from),
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            allocated_datetime: self.allocated_datetime.map(DatetimeFilter::from),
            picked_datetime: self.picked_datetime.map(DatetimeFilter::from),
            shipped_datetime: self.shipped_datetime.map(DatetimeFilter::from),
            delivered_datetime: self.delivered_datetime.map(DatetimeFilter::from),
            verified_datetime: self.verified_datetime.map(DatetimeFilter::from),
            colour: self.colour.map(EqualFilter::from),
            requisition_id: self.requisition_id.map(EqualFilter::from),
            linked_invoice_id: self.linked_invoice_id.map(EqualFilter::from),
            stock_line_id: None,
        }
    }
}

impl InvoiceSortInput {
    pub fn to_domain(self) -> InvoiceSort {
        use InvoiceSortField as to;
        use InvoiceSortFieldInput as from;
        let key = match self.key {
            from::Type => to::Type,
            from::OtherPartyName => to::OtherPartyName,
            from::InvoiceNumber => to::InvoiceNumber,
            from::Comment => to::Comment,
            from::Status => to::Status,
            from::CreatedDatetime => to::CreatedDatetime,
            from::AllocatedDatetime => to::AllocatedDatetime,
            from::PickedDatetime => to::PickedDatetime,
            from::ShippedDatetime => to::ShippedDatetime,
            from::DeliveredDatetime => to::DeliveredDatetime,
            from::VerifiedDatetime => to::VerifiedDatetime,
            from::TheirReference => to::TheirReference,
            from::TransportReference => to::TransportReference,
        };

        InvoiceSort {
            key,
            desc: self.desc,
        }
    }
}
