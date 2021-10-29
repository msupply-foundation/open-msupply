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

trait IsError {
    fn is_error(&self) -> bool;
}
trait GetId {
    fn get_id(&self) -> String;
}

impl IsError for InsertInboundShipmentResponse {
    fn is_error(&self) -> bool {
        matches!(self, InsertInboundShipmentResponse::Error(_))
    }
}

impl GetId for InsertInboundShipmentInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

impl IsError for UpdateInboundShipmentResponse {
    fn is_error(&self) -> bool {
        matches!(self, UpdateInboundShipmentResponse::Error(_))
    }
}

impl GetId for UpdateInboundShipmentInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

impl IsError for DeleteInboundShipmentResponse {
    fn is_error(&self) -> bool {
        matches!(self, DeleteInboundShipmentResponse::Error(_))
    }
}

impl GetId for DeleteInboundShipmentInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

impl IsError for InsertInboundShipmentLineResponse {
    fn is_error(&self) -> bool {
        matches!(self, InsertInboundShipmentLineResponse::Error(_))
    }
}

impl GetId for InsertInboundShipmentLineInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

impl IsError for UpdateInboundShipmentLineResponse {
    fn is_error(&self) -> bool {
        matches!(self, UpdateInboundShipmentLineResponse::Error(_))
    }
}

impl GetId for UpdateInboundShipmentLineInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

impl IsError for DeleteInboundShipmentLineResponse {
    fn is_error(&self) -> bool {
        matches!(self, DeleteInboundShipmentLineResponse::Error(_))
    }
}

impl GetId for DeleteInboundShipmentLineInput {
    fn get_id(&self) -> String {
        self.id.clone()
    }
}

fn do_mutations<Input, Output, F>(
    con: &StorageConnectionManager,
    inputs: Option<Vec<Input>>,
    f: F,
) -> (bool, Option<Vec<MutationWithId<Output>>>)
where
    Input: GetId,
    Output: OutputType + IsError,
    F: FnOnce(&StorageConnectionManager, Input) -> Output + Copy,
{
    if let Some(inputs) = inputs {
        let mut responses = Vec::new();
        for input in inputs.into_iter() {
            let id = input.get_id();
            responses.push(MutationWithId {
                id,
                response: f(con, input),
            });
        }
        let has_errors = responses
            .iter()
            .any(|mutation_with_id| mutation_with_id.response.is_error());
        (has_errors, Some(responses))
    } else {
        (false, None)
    }
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

    let (has_errors, responses) = do_mutations(
        connection_manager,
        insert_inbound_shipments,
        get_insert_inbound_shipment_response,
    );
    result.insert_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations(
        connection_manager,
        insert_inbound_shipment_lines,
        get_insert_inbound_shipment_line_response,
    );
    result.insert_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations(
        connection_manager,
        update_inbound_shipment_lines,
        get_update_inbound_shipment_line_response,
    );
    result.update_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations(
        connection_manager,
        delete_inbound_shipment_lines,
        get_delete_inbound_shipment_line_response,
    );
    result.delete_inbound_shipment_lines = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations(
        connection_manager,
        update_inbound_shipments,
        get_update_inbound_shipment_response,
    );
    result.update_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    let (has_errors, responses) = do_mutations(
        connection_manager,
        delete_inbound_shipments,
        get_delete_inbound_shipment_response,
    );
    result.delete_inbound_shipments = responses;
    if has_errors {
        return result;
    }

    result
}
