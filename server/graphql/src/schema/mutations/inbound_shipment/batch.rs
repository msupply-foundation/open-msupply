use crate::schema::mutations::{
    inbound_shipment::{
        delete::get_delete_inbound_shipment_response, get_delete_inbound_shipment_line_response,
        get_insert_inbound_shipment_line_response, get_update_inbound_shipment_line_response,
        get_update_inbound_shipment_response,
    },
    MutationWithId,
};
use repository::StorageConnectionManager;

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

pub fn get_batch_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    store_id: &str,
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

    if let Some(inputs) = insert_inbound_shipments {
        let (has_errors, responses) =
            do_insert_inbound_shipments(connection_manager, store_id, inputs);
        result.insert_inbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = insert_inbound_shipment_lines {
        let (has_errors, responses) = do_insert_inbound_shipment_lines(connection_manager, inputs);
        result.insert_inbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = update_inbound_shipment_lines {
        let (has_errors, responses) = do_update_inbound_shipment_lines(connection_manager, inputs);
        result.update_inbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = delete_inbound_shipment_lines {
        let (has_errors, responses) = do_delete_inbound_shipment_lines(connection_manager, inputs);
        result.delete_inbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = update_inbound_shipments {
        let (has_errors, responses) = do_update_inbound_shipments(connection_manager, inputs);
        result.update_inbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = delete_inbound_shipments {
        let (has_errors, responses) = do_delete_inbound_shipments(connection_manager, inputs);
        result.delete_inbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    result
}

pub fn do_insert_inbound_shipments(
    connection: &StorageConnectionManager,
    store_id: &str,
    inputs: Vec<InsertInboundShipmentInput>,
) -> (bool, Vec<MutationWithId<InsertInboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_insert_inbound_shipment_response(connection, store_id, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            InsertInboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_update_inbound_shipments(
    connection: &StorageConnectionManager,
    inputs: Vec<UpdateInboundShipmentInput>,
) -> (bool, Vec<MutationWithId<UpdateInboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_update_inbound_shipment_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            UpdateInboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_delete_inbound_shipments(
    connection: &StorageConnectionManager,
    inputs: Vec<DeleteInboundShipmentInput>,
) -> (bool, Vec<MutationWithId<DeleteInboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_delete_inbound_shipment_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            DeleteInboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_insert_inbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<InsertInboundShipmentLineInput>,
) -> (bool, Vec<MutationWithId<InsertInboundShipmentLineResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_insert_inbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            InsertInboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_update_inbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<UpdateInboundShipmentLineInput>,
) -> (bool, Vec<MutationWithId<UpdateInboundShipmentLineResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_update_inbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            UpdateInboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_delete_inbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<DeleteInboundShipmentLineInput>,
) -> (bool, Vec<MutationWithId<DeleteInboundShipmentLineResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_delete_inbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            DeleteInboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}
