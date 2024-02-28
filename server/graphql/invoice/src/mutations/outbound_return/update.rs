use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::invoice::outbound_return::update::{
    UpdateOutboundReturn as ServiceInput, UpdateOutboundReturnError as ServiceError,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::outbound_return::update::UpdateOutboundReturnStatus,
};

use super::insert::OutboundReturnLineInput;

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundReturnInput")]
pub struct UpdateInput {
    pub id: String,
    // supplier_id: String, // do we want to able to change the supplier we're returning to?
    status: Option<UpdateOutboundReturnStatusInput>,
    outbound_return_lines: Vec<OutboundReturnLineInput>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateOutboundReturnStatusInput {
    Allocated,
    Picked,
    Shipped,
}

// #[derive(InputObject)]
// pub struct OutboundReturnLineInput {
//     pub id: String,
//     pub stock_line_id: String,
//     pub number_of_packs_to_return: f64,
//     pub reason_id: Option<String>,
//     pub comment: Option<String>,
// }

#[derive(Union)]
#[graphql(name = "UpdateOutboundReturnResponse")]
pub enum UpdateResponse {
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
        .update_outbound_return(&service_context, input.to_domain());

    match result {
        Ok(outbound_return) => Ok(UpdateResponse::Response(InvoiceNode::from_domain(
            outbound_return,
        ))),
        Err(err) => map_error(err),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // TODO - are there any structured errors??
        // ServiceError::OtherPartyNotVisible => {
        //     return Ok(UpdateErrorInterface::OtherPartyNotVisible(
        //         OtherPartyNotVisible,
        //     ))
        // }

        // Standard Graphql Errors
        // not sure whether any of these should be structured errors..
        ServiceError::NotAnOutboundReturn
        | ServiceError::ReturnDoesNotBelongToCurrentStore
        | ServiceError::ReturnIsNotEditable
        | ServiceError::ReturnDoesNotExist => BadUserInput(formatted_error),
        ServiceError::LineInsertError { .. }
        | ServiceError::LineUpdateError { .. }
        | ServiceError::LineDeleteError { .. }
        | ServiceError::LineReturnReasonUpdateError { .. }
        | ServiceError::UpdatedReturnDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            status,
            outbound_return_lines,
        }: UpdateInput = self;

        ServiceInput {
            id,
            status: status.map(|status| status.to_domain()),
            outbound_return_lines: outbound_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}

impl UpdateOutboundReturnStatusInput {
    pub fn to_domain(&self) -> UpdateOutboundReturnStatus {
        use UpdateOutboundReturnStatus::*;
        match self {
            UpdateOutboundReturnStatusInput::Allocated => Allocated,
            UpdateOutboundReturnStatusInput::Picked => Picked,
            UpdateOutboundReturnStatusInput::Shipped => Shipped,
        }
    }
}
// impl OutboundReturnLineInput {
//     // TODO: only one of these?
//     pub fn to_domain_update(self) -> UpdateOutboundReturnLine {
//         let OutboundReturnLineInput {
//             id,
//             stock_line_id,
//             number_of_packs_to_return,
//             reason_id,
//             comment,
//         }: OutboundReturnLineInput = self;

//         UpdateOutboundReturnLine {
//             id,
//             stock_line_id,
//             number_of_packs: number_of_packs_to_return,
//             reason_id,
//             note: comment,
//         }
//     }
// }
