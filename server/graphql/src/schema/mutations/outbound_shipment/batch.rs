use crate::schema::mutations::{
    outbound_shipment::{
        delete::get_delete_outbound_shipment_response, get_delete_outbound_shipment_line_response,
        get_insert_outbound_shipment_line_response, get_update_outbound_shipment_line_response,
        get_update_outbound_shipment_response,
    },
    MutationWithId,
};
use repository::StorageConnectionManager;

use super::{
    delete::DeleteOutboundShipmentResponse,
    get_delete_outbound_shipment_service_line_response,
    get_insert_outbound_shipment_service_line_response,
    get_update_outbound_shipment_service_line_response,
    insert::{
        get_insert_outbound_shipment_response, InsertOutboundShipmentInput,
        InsertOutboundShipmentResponse,
    },
    DeleteOutboundShipmentLineInput, DeleteOutboundShipmentLineResponse,
    DeleteOutboundShipmentServiceLineInput, DeleteOutboundShipmentServiceLineResponse,
    InsertOutboundShipmentLineInput, InsertOutboundShipmentLineResponse,
    InsertOutboundShipmentServiceLineInput, InsertOutboundShipmentServiceLineResponse,
    UpdateOutboundShipmentInput, UpdateOutboundShipmentLineInput,
    UpdateOutboundShipmentLineResponse, UpdateOutboundShipmentResponse,
    UpdateOutboundShipmentServiceLineInput, UpdateOutboundShipmentServiceLineResponse,
};
use async_graphql::*;

#[derive(SimpleObject)]
pub struct BatchOutboundShipmentResponse {
    insert_outbound_shipments: Option<Vec<MutationWithId<InsertOutboundShipmentResponse>>>,
    insert_outbound_shipment_lines: Option<Vec<MutationWithId<InsertOutboundShipmentLineResponse>>>,
    update_outbound_shipment_lines: Option<Vec<MutationWithId<UpdateOutboundShipmentLineResponse>>>,
    delete_outbound_shipment_lines: Option<Vec<MutationWithId<DeleteOutboundShipmentLineResponse>>>,
    insert_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<InsertOutboundShipmentServiceLineResponse>>>,
    update_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<UpdateOutboundShipmentServiceLineResponse>>>,
    delete_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<DeleteOutboundShipmentServiceLineResponse>>>,
    update_outbound_shipments: Option<Vec<MutationWithId<UpdateOutboundShipmentResponse>>>,
    delete_outbound_shipments: Option<Vec<MutationWithId<DeleteOutboundShipmentResponse>>>,
}

pub fn get_batch_outbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    store_id: &str,
    insert_outbound_shipments: Option<Vec<InsertOutboundShipmentInput>>,
    insert_outbound_shipment_lines: Option<Vec<InsertOutboundShipmentLineInput>>,
    update_outbound_shipment_lines: Option<Vec<UpdateOutboundShipmentLineInput>>,
    delete_outbound_shipment_lines: Option<Vec<DeleteOutboundShipmentLineInput>>,
    insert_outbound_shipment_service_lines: Option<Vec<InsertOutboundShipmentServiceLineInput>>,
    update_outbound_shipment_service_lines: Option<Vec<UpdateOutboundShipmentServiceLineInput>>,
    delete_outbound_shipment_service_lines: Option<Vec<DeleteOutboundShipmentServiceLineInput>>,
    update_outbound_shipments: Option<Vec<UpdateOutboundShipmentInput>>,
    delete_outbound_shipments: Option<Vec<String>>,
) -> BatchOutboundShipmentResponse {
    let mut result = BatchOutboundShipmentResponse {
        insert_outbound_shipments: None,
        insert_outbound_shipment_lines: None,
        update_outbound_shipment_lines: None,
        delete_outbound_shipment_lines: None,
        insert_outbound_shipment_service_lines: None,
        update_outbound_shipment_service_lines: None,
        delete_outbound_shipment_service_lines: None,
        update_outbound_shipments: None,
        delete_outbound_shipments: None,
    };

    if let Some(inputs) = insert_outbound_shipments {
        let (has_errors, responses) =
            do_insert_outbound_shipments(connection_manager, store_id, inputs);
        result.insert_outbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = insert_outbound_shipment_lines {
        let (has_errors, responses) = do_insert_outbound_shipment_lines(connection_manager, inputs);
        result.insert_outbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = update_outbound_shipment_lines {
        let (has_errors, responses) = do_update_outbound_shipment_lines(connection_manager, inputs);
        result.update_outbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = delete_outbound_shipment_lines {
        let (has_errors, responses) = do_delete_outbound_shipment_lines(connection_manager, inputs);
        result.delete_outbound_shipment_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = insert_outbound_shipment_service_lines {
        let (has_errors, responses) =
            do_insert_outbound_shipment_service_lines(connection_manager, inputs);
        result.insert_outbound_shipment_service_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = update_outbound_shipment_service_lines {
        let (has_errors, responses) =
            do_update_outbound_shipment_service_lines(connection_manager, inputs);
        result.update_outbound_shipment_service_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = delete_outbound_shipment_service_lines {
        let (has_errors, responses) =
            do_delete_outbound_shipment_service_lines(connection_manager, inputs);
        result.delete_outbound_shipment_service_lines = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = update_outbound_shipments {
        let (has_errors, responses) = do_update_outbound_shipments(connection_manager, inputs);
        result.update_outbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    if let Some(inputs) = delete_outbound_shipments {
        let (has_errors, responses) = do_delete_outbound_shipments(connection_manager, inputs);
        result.delete_outbound_shipments = Some(responses);
        if has_errors {
            return result;
        }
    }

    result
}

pub fn do_insert_outbound_shipments(
    connection: &StorageConnectionManager,
    store_id: &str,
    inputs: Vec<InsertOutboundShipmentInput>,
) -> (bool, Vec<MutationWithId<InsertOutboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_insert_outbound_shipment_response(connection, store_id, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            InsertOutboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_update_outbound_shipments(
    connection: &StorageConnectionManager,
    inputs: Vec<UpdateOutboundShipmentInput>,
) -> (bool, Vec<MutationWithId<UpdateOutboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_update_outbound_shipment_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            UpdateOutboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_delete_outbound_shipments(
    connection: &StorageConnectionManager,
    inputs: Vec<String>,
) -> (bool, Vec<MutationWithId<DeleteOutboundShipmentResponse>>) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.clone();
        responses.push(MutationWithId {
            id,
            response: get_delete_outbound_shipment_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            DeleteOutboundShipmentResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_insert_outbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<InsertOutboundShipmentLineInput>,
) -> (
    bool,
    Vec<MutationWithId<InsertOutboundShipmentLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_insert_outbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            InsertOutboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_update_outbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<UpdateOutboundShipmentLineInput>,
) -> (
    bool,
    Vec<MutationWithId<UpdateOutboundShipmentLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_update_outbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            UpdateOutboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_delete_outbound_shipment_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<DeleteOutboundShipmentLineInput>,
) -> (
    bool,
    Vec<MutationWithId<DeleteOutboundShipmentLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_delete_outbound_shipment_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            DeleteOutboundShipmentLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_insert_outbound_shipment_service_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<InsertOutboundShipmentServiceLineInput>,
) -> (
    bool,
    Vec<MutationWithId<InsertOutboundShipmentServiceLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_insert_outbound_shipment_service_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            InsertOutboundShipmentServiceLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_update_outbound_shipment_service_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<UpdateOutboundShipmentServiceLineInput>,
) -> (
    bool,
    Vec<MutationWithId<UpdateOutboundShipmentServiceLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_update_outbound_shipment_service_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            UpdateOutboundShipmentServiceLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}

pub fn do_delete_outbound_shipment_service_lines(
    connection: &StorageConnectionManager,
    inputs: Vec<DeleteOutboundShipmentServiceLineInput>,
) -> (
    bool,
    Vec<MutationWithId<DeleteOutboundShipmentServiceLineResponse>>,
) {
    let mut responses = Vec::new();
    for input in inputs.into_iter() {
        let id = input.id.clone();
        responses.push(MutationWithId {
            id,
            response: get_delete_outbound_shipment_service_line_response(connection, input),
        });
    }
    let has_errors = responses.iter().any(|mutation_with_id| {
        matches!(
            mutation_with_id.response,
            DeleteOutboundShipmentServiceLineResponse::Error(_)
        )
    });

    (has_errors, responses)
}
