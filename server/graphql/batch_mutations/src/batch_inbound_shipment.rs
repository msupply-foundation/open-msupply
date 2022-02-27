// use async_graphql::*;
// use graphql_invoice::mutations::inbound_shipment::{
//     get_delete_inbound_shipment_response, get_insert_inbound_shipment_response,
//     get_update_inbound_shipment_response, DeleteInboundShipmentInput,
//     DeleteInboundShipmentResponse, InsertInboundShipmentInput, InsertInboundShipmentResponse,
//     UpdateInboundShipmentInput, UpdateInboundShipmentResponse,
// };
// use graphql_invoice_line::mutations::inbound_shipment_line::{
//     get_delete_inbound_shipment_line_response, get_insert_inbound_shipment_line_response,
//     get_update_inbound_shipment_line_response, DeleteInboundShipmentLineInput,
//     DeleteInboundShipmentLineResponse, InsertInboundShipmentLineInput,
//     InsertInboundShipmentLineResponse, UpdateInboundShipmentLineInput,
//     UpdateInboundShipmentLineResponse,
// };
// use repository::StorageConnectionManager;

// #[derive(SimpleObject)]
// #[graphql(concrete(
//     name = "InsertInboundShipmentResponseWithId",
//     params(InsertInboundShipmentResponse)
// ))]
// #[graphql(concrete(
//     name = "UpdateInboundShipmentResponseWithId",
//     params(UpdateInboundShipmentResponse)
// ))]
// #[graphql(concrete(
//     name = "DeleteInboundShipmentResponseWithId",
//     params(DeleteInboundShipmentResponse)
// ))]
// #[graphql(concrete(
//     name = "InsertInboundShipmentLineResponseWithId",
//     params(InsertInboundShipmentLineResponse)
// ))]
// #[graphql(concrete(
//     name = "UpdateInboundShipmentLineResponseWithId",
//     params(UpdateInboundShipmentLineResponse)
// ))]
// #[graphql(concrete(
//     name = "DeleteInboundShipmentLineResponseWithId",
//     params(DeleteInboundShipmentLineResponse)
// ))]
// pub struct MutationWithId<T: OutputType> {
//     pub id: String,
//     pub response: T,
// }

// #[derive(SimpleObject)]
// pub struct BatchInboundShipmentResponse {
//     insert_inbound_shipments: Option<Vec<MutationWithId<InsertInboundShipmentResponse>>>,
//     insert_inbound_shipment_lines: Option<Vec<MutationWithId<InsertInboundShipmentLineResponse>>>,
//     update_inbound_shipment_lines: Option<Vec<MutationWithId<UpdateInboundShipmentLineResponse>>>,
//     delete_inbound_shipment_lines: Option<Vec<MutationWithId<DeleteInboundShipmentLineResponse>>>,
//     update_inbound_shipments: Option<Vec<MutationWithId<UpdateInboundShipmentResponse>>>,
//     delete_inbound_shipments: Option<Vec<MutationWithId<DeleteInboundShipmentResponse>>>,
// }

// #[derive(InputObject)]
// pub struct BatchInboundShipmentInput {
//     pub insert_inbound_shipments: Option<Vec<InsertInboundShipmentInput>>,
//     pub insert_inbound_shipment_lines: Option<Vec<InsertInboundShipmentLineInput>>,
//     pub update_inbound_shipment_lines: Option<Vec<UpdateInboundShipmentLineInput>>,
//     pub delete_inbound_shipment_lines: Option<Vec<DeleteInboundShipmentLineInput>>,
//     pub update_inbound_shipments: Option<Vec<UpdateInboundShipmentInput>>,
//     pub delete_inbound_shipments: Option<Vec<DeleteInboundShipmentInput>>,
// }

// pub fn get_batch_inbound_shipment_response(
//     connection_manager: &StorageConnectionManager,
//     store_id: &str,
//     input: BatchInboundShipmentInput,
// ) -> BatchInboundShipmentResponse {
//     let mut result = BatchInboundShipmentResponse {
//         insert_inbound_shipments: None,
//         insert_inbound_shipment_lines: None,
//         update_inbound_shipment_lines: None,
//         delete_inbound_shipment_lines: None,
//         update_inbound_shipments: None,
//         delete_inbound_shipments: None,
//     };

//     if let Some(inputs) = input.insert_inbound_shipments {
//         let (has_errors, responses) =
//             do_insert_inbound_shipments(connection_manager, store_id, inputs);
//         result.insert_inbound_shipments = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     if let Some(inputs) = input.insert_inbound_shipment_lines {
//         let (has_errors, responses) = do_insert_inbound_shipment_lines(connection_manager, inputs);
//         result.insert_inbound_shipment_lines = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     if let Some(inputs) = input.update_inbound_shipment_lines {
//         let (has_errors, responses) = do_update_inbound_shipment_lines(connection_manager, inputs);
//         result.update_inbound_shipment_lines = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     if let Some(inputs) = input.delete_inbound_shipment_lines {
//         let (has_errors, responses) = do_delete_inbound_shipment_lines(connection_manager, inputs);
//         result.delete_inbound_shipment_lines = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     if let Some(inputs) = input.update_inbound_shipments {
//         let (has_errors, responses) = do_update_inbound_shipments(connection_manager, inputs);
//         result.update_inbound_shipments = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     if let Some(inputs) = input.delete_inbound_shipments {
//         let (has_errors, responses) = do_delete_inbound_shipments(connection_manager, inputs);
//         result.delete_inbound_shipments = Some(responses);
//         if has_errors {
//             return result;
//         }
//     }

//     result
// }

// pub fn do_insert_inbound_shipments(
//     connection: &StorageConnectionManager,
//     store_id: &str,
//     inputs: Vec<InsertInboundShipmentInput>,
// ) -> (bool, Vec<MutationWithId<InsertInboundShipmentResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_insert_inbound_shipment_response(connection, store_id, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             InsertInboundShipmentResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// pub fn do_update_inbound_shipments(
//     connection: &StorageConnectionManager,
//     inputs: Vec<UpdateInboundShipmentInput>,
// ) -> (bool, Vec<MutationWithId<UpdateInboundShipmentResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_update_inbound_shipment_response(connection, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             UpdateInboundShipmentResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// pub fn do_delete_inbound_shipments(
//     connection: &StorageConnectionManager,
//     inputs: Vec<DeleteInboundShipmentInput>,
// ) -> (bool, Vec<MutationWithId<DeleteInboundShipmentResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_delete_inbound_shipment_response(connection, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             DeleteInboundShipmentResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// pub fn do_insert_inbound_shipment_lines(
//     connection: &StorageConnectionManager,
//     inputs: Vec<InsertInboundShipmentLineInput>,
// ) -> (bool, Vec<MutationWithId<InsertInboundShipmentLineResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_insert_inbound_shipment_line_response(connection, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             InsertInboundShipmentLineResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// pub fn do_update_inbound_shipment_lines(
//     connection: &StorageConnectionManager,
//     inputs: Vec<UpdateInboundShipmentLineInput>,
// ) -> (bool, Vec<MutationWithId<UpdateInboundShipmentLineResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_update_inbound_shipment_line_response(connection, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             UpdateInboundShipmentLineResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// pub fn do_delete_inbound_shipment_lines(
//     connection: &StorageConnectionManager,
//     inputs: Vec<DeleteInboundShipmentLineInput>,
// ) -> (bool, Vec<MutationWithId<DeleteInboundShipmentLineResponse>>) {
//     let mut responses = Vec::new();
//     for input in inputs.into_iter() {
//         let id = input.id.clone();
//         responses.push(MutationWithId {
//             id,
//             response: get_delete_inbound_shipment_line_response(connection, input),
//         });
//     }
//     let has_errors = responses.iter().any(|mutation_with_id| {
//         matches!(
//             mutation_with_id.response,
//             DeleteInboundShipmentLineResponse::Error(_)
//         )
//     });

//     (has_errors, responses)
// }

// mod graphql {
//     use crate::graphql::assert_graphql_query;
//     use repository::{
//         mock::{mock_stock_line_a, mock_stock_line_b, mock_store_a, MockDataInserts},
//         InboundShipmentLineRowRepository,
//     };
//     use serde_json::json;
//     use server::test_utils::setup_all;

//     #[actix_rt::test]
//     async fn test_graphql_inboundshipment_batch() {
//         let (_, connection, _, settings) = setup_all(
//             "omsupply-database-gql-inboundshipment_batch",
//             MockDataInserts::all(),
//         )
//         .await;

//         let query = r#"mutation BatchInboundShipment($storeId: String, $input: BatchInboundShipmentInput!) {
//           batchInboundShipment(input: $input) {
//             __typename
//             ... on BatchInboundShipmentResponses {
//               insertInboundShipments {
//                 id
//                 response {
//                   ... on InvoiceNod {
//                     id
//                   }
//                 }
//               }
//           }
//         }"#;

//         // success

//         let variables = Some(json!({
//             "input": {
//               "insertInboundShipments": [
//                 {
//                   "id": "batch_inboundshipment_1",
//                   "createdDatetime": "2022-02-09T15:16:00",
//                 },
//               ],
//               "insertInboundShipmentLines": [
//                 {
//                   "id": "batch_inboundshipment_line_1",
//                   "inboundshipmentId": "batch_inboundshipment_1",
//                   "stockLineId": stock_line_a.id,
//                 },
//                 {
//                   "id": "batch_inboundshipment_line_2",
//                   "inboundshipmentId": "batch_inboundshipment_1",
//                   "stockLineId": stock_line_b.id,
//                 }
//               ],
//             }
//         }));
//         let expected = json!({
//           "batchInboundShipment": {
//               "__typename": "BatchInboundShipmentResponses",
//               "insertInboundShipments": [
//                 {
//                   "id": "batch_inboundshipment_1",
//                 }
//               ],
//               "insertInboundShipmentLines": [
//                 {
//                   "id": "batch_inboundshipment_line_1",
//                   "response": {
//                     "id": "batch_inboundshipment_line_1",
//                   }
//                 },
//                 {
//                   "id": "batch_inboundshipment_line_2",
//                   "response": {
//                     "id": "batch_inboundshipment_line_2",
//                   }
//                 }
//               ],
//             }
//           }
//         );
//         assert_graphql_query!(&settings, query, &variables, &expected, None);
//     }
// }
