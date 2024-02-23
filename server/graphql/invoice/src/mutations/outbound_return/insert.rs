use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::outbound_return::insert::{
    InsertOutboundReturn as ServiceInput, InsertOutboundReturnLine,
};

#[derive(InputObject)]
#[graphql(name = "OutboundReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub supplier_id: String, // to be other_party_id
    pub outbound_return_lines: Vec<OutboundReturnLineInput>,
}

#[derive(InputObject)]
pub struct OutboundReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs_to_return: f64,
    pub reason_id: Option<String>,
    pub comment: String,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundReturnResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateOutboundReturn, // TODO
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .insert_outbound_return(&service_context, input);

    Ok(InsertResponse::Response(InvoiceNode::from_domain(
        Invoice {
            ..Default::default()
        },
    )))
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            supplier_id,
            outbound_return_lines,
        }: InsertInput = self;

        ServiceInput {
            id,
            other_party_id: supplier_id,
            outbound_return_lines: outbound_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}

impl OutboundReturnLineInput {
    pub fn to_domain(self) -> InsertOutboundReturnLine {
        let OutboundReturnLineInput {
            id,
            stock_line_id,
            number_of_packs_to_return,
            reason_id,
            comment,
        }: OutboundReturnLineInput = self;

        InsertOutboundReturnLine {
            id,
            stock_line_id,
            number_of_packs: number_of_packs_to_return,
            reason_id,
            note: comment,
        }
    }
}
