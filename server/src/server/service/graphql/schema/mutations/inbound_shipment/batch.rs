use crate::{
    database::repository::StorageConnectionManager,
    server::service::graphql::schema::mutations::{
        inbound_shipment::{
            delete::get_delete_inbound_shipment_response,
            get_delete_inbound_shipment_line_response, get_insert_inbound_shipment_line_response,
            get_update_inbound_shipment_line_response, get_update_inbound_shipment_response,
        },
        MutationWithId,
    },
};

use super::{
    delete::{DeleteInboundShipmentInput, DeleteInboundShipmentResponse},
    insert::{
        get_insert_inbound_shipment_response, InsertInboundShipmentInput,
        InsertInboundShipmentResponse,
    },
    DeleteInboundShipmentLineInput, DeleteInboundShipmentLineResponse,
    InsertInboundShipmentLineInput, InsertInboundShipmentLineResponse, UpdateInboundShipmentInput,
    UpdateInboundShipmentLineInput, UpdateInboundShipmentLineResponse,
    UpdateInboundShipmentResponse,
};
use async_graphql::*;

#[derive(SimpleObject)]
pub struct BatchInboundShipmentResponse {
    insert_inbound_shipments: Option<Vec<MutationWithId<InsertInboundShipmentResponse>>>,
    insert_inbound_shipment_lines: Option<Vec<MutationWithId<InsertInboundShipmentLineResponse>>>,
    update_inbound_shipment_lines: Option<Vec<MutationWithId<UpdateInboundShipmentLineResponse>>>,
    delete_inbound_shipment_lines: Option<Vec<MutationWithId<DeleteInboundShipmentLineResponse>>>,
    update_inbound_shipments: Option<Vec<MutationWithId<UpdateInboundShipmentResponse>>>,
    delete_inbound_shipments: Option<Vec<MutationWithId<DeleteInboundShipmentResponse>>>,
}

macro_rules! do_mutations {
    ($connection_manager:ident, $mutation_inputs_option:ident, $mutation_error_match:pat_param, $mutation_method:ident) => {{
        if let Some(mutations_inputs) = $mutation_inputs_option {
            let mut responses = Vec::new();
            for mutation_input in mutations_inputs.into_iter() {
                let id = mutation_input.id.clone();
                responses.push(MutationWithId {
                    id,
                    response: $mutation_method($connection_manager, mutation_input),
                });
            }
            let has_errors =
                responses
                    .iter()
                    .any(|mutation_with_id| match mutation_with_id.response {
                        $mutation_error_match => true,
                        _ => false,
                    });
            (has_errors, Some(responses))
        } else {
            (false, None)
        }
    }};
}

pub fn get_batch_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    insert_inbound_shipments: Option<Vec<InsertInboundShipmentInput>>,
    insert_inbound_shipment_lines: Option<Vec<InsertInboundShipmentLineInput>>,
    update_inbound_shipment_lines: Option<Vec<UpdateInboundShipmentLineInput>>,
    delete_inbound_shipment_lines: Option<Vec<DeleteInboundShipmentLineInput>>,
    update_inbound_shipments: Option<Vec<UpdateInboundShipmentInput>>,
    delete_inbound_shipments: Option<Vec<DeleteInboundShipmentInput>>,
) -> BatchInboundShipmentResponse {
    let mut result = BatchInboundShipmentResponse {
        insert_inbound_shipments: None,
        insert_inbound_shipment_lines: None,
        update_inbound_shipment_lines: None,
        delete_inbound_shipment_lines: None,
        update_inbound_shipments: None,
        delete_inbound_shipments: None,
    };

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        insert_inbound_shipments,
        InsertInboundShipmentResponse::Error(_),
        get_insert_inbound_shipment_response
    );
    result.insert_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        insert_inbound_shipment_lines,
        InsertInboundShipmentLineResponse::Error(_),
        get_insert_inbound_shipment_line_response
    );
    result.insert_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        update_inbound_shipment_lines,
        UpdateInboundShipmentLineResponse::Error(_),
        get_update_inbound_shipment_line_response
    );
    result.update_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        delete_inbound_shipment_lines,
        DeleteInboundShipmentLineResponse::Error(_),
        get_delete_inbound_shipment_line_response
    );
    result.delete_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        update_inbound_shipments,
        UpdateInboundShipmentResponse::Error(_),
        get_update_inbound_shipment_response
    );
    result.update_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations!(
        connection_manager,
        delete_inbound_shipments,
        DeleteInboundShipmentResponse::Error(_),
        get_delete_inbound_shipment_response
    );
    result.delete_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    result
}
