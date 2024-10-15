use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_invoice::mutations::prescription;
use graphql_invoice_line::mutations::prescription_line;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::prescription::*;

use crate::{to_standard_error, VecOrNone};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertPrescriptionResponseWithId",
    params(prescription::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdatePrescriptionResponseWithId",
    params(prescription::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeletePrescriptionResponseWithId",
    params(prescription::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertPrescriptionLineResponseWithId",
    params(prescription_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdatePrescriptionLineResponseWithId",
    params(prescription_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeletePrescriptionLineResponseWithId",
    params(prescription_line::delete::DeleteResponse)
))]

pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type ServiceInput = BatchPrescription;
type ServiceResult = BatchPrescriptionResult;

type InsertPrescriptionsResponse =
    Option<Vec<MutationWithId<prescription::insert::InsertResponse>>>;
type InsertLinesResponse = Option<Vec<MutationWithId<prescription_line::insert::InsertResponse>>>;
type UpdateLinesResponse = Option<Vec<MutationWithId<prescription_line::update::UpdateResponse>>>;
type DeleteLinesResponse = Option<Vec<MutationWithId<prescription_line::delete::DeleteResponse>>>;
type UpdatePrescriptionsResponse =
    Option<Vec<MutationWithId<prescription::update::UpdateResponse>>>;
type DeletePrescriptionsResponse =
    Option<Vec<MutationWithId<prescription::delete::DeleteResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchPrescriptionResponse")]
pub struct BatchResponse {
    insert_prescriptions: InsertPrescriptionsResponse,
    insert_prescription_lines: InsertLinesResponse,
    update_prescription_lines: UpdateLinesResponse,
    delete_prescription_lines: DeleteLinesResponse,
    update_prescriptions: UpdatePrescriptionsResponse,
    delete_prescriptions: DeletePrescriptionsResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchPrescriptionInput")]
pub struct BatchInput {
    pub insert_prescriptions: Option<Vec<prescription::insert::InsertInput>>,
    pub insert_prescription_lines: Option<Vec<prescription_line::insert::InsertInput>>,
    pub update_prescription_lines: Option<Vec<prescription_line::update::UpdateInput>>,
    pub delete_prescription_lines: Option<Vec<prescription_line::delete::DeleteInput>>,
    pub update_prescriptions: Option<Vec<prescription::update::UpdateInput>>,
    pub delete_prescriptions: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .invoice_service
        .batch_prescription(&service_context, input.to_domain())?;

    BatchResponse::from_domain(response)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_prescriptions,
            insert_prescription_lines,
            update_prescription_lines,
            delete_prescription_lines,
            update_prescriptions,
            delete_prescriptions,
            continue_on_error,
        } = self;

        ServiceInput {
            insert_prescription: insert_prescriptions
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_prescription_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_prescription_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_prescription_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_prescription: update_prescriptions
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_prescription: delete_prescriptions,
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_prescription,
            insert_line,
            update_line,
            delete_line,
            update_prescription,
            delete_prescription,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_prescriptions: map_insert_prescriptions(insert_prescription)?,
            insert_prescription_lines: map_insert_lines(insert_line)?,
            update_prescription_lines: map_update_lines(update_line)?,
            delete_prescription_lines: map_delete_lines(delete_line)?,
            update_prescriptions: map_update_prescriptions(update_prescription)?,
            delete_prescriptions: map_delete_prescriptions(delete_prescription)?,
        };

        Ok(result)
    }
}

fn map_insert_prescriptions(
    responses: InsertPrescriptionsResult,
) -> Result<InsertPrescriptionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription::insert::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_prescriptions(
    responses: UpdatePrescriptionsResult,
) -> Result<UpdatePrescriptionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription::update::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_prescriptions(
    responses: DeletePrescriptionsResult,
) -> Result<DeletePrescriptionsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_lines(responses: InsertLinesResult) -> Result<InsertLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription_line::insert::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_lines(responses: UpdateLinesResult) -> Result<UpdateLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription_line::update::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_lines(responses: DeleteLinesResult) -> Result<DeleteLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match prescription_line::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, InvoiceLine, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            prescription::{
                BatchPrescription, BatchPrescriptionResult, DeletePrescriptionError,
                InsertPrescription, InsertPrescriptionError, UpdatePrescription,
                UpdatePrescriptionError,
            },
            InvoiceServiceTrait,
        },
        invoice_line::stock_out_line::{
            DeleteStockOutLine, DeleteStockOutLineError, InsertStockOutLine,
            InsertStockOutLineError, StockOutType, UpdateStockOutLine, UpdateStockOutLineError,
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchPrescription;
    type ServiceResponse = BatchPrescriptionResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl InvoiceServiceTrait for TestService {
        fn batch_prescription(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<ServiceResponse, RepositoryError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_batch_prescription() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            BatchMutations,
            "test_graphql_batch_prescription",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation mut($input: BatchPrescriptionInput!, $storeId: String!) {
            batchPrescription(input: $input, storeId: $storeId) {
              insertPrescriptions {
                id
              }
              insertPrescriptionLines {
                id
                response {
                  ... on InsertPrescriptionLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updatePrescriptionLines {
                id
                response {
                  ... on UpdatePrescriptionLineError {
                    error {
                      __typename
                    }
                  }
                  ... on InvoiceLineNode {
                      id
                  }
                }
              }
              deletePrescriptionLines {
                response {
                  ... on DeletePrescriptionLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              updatePrescriptions {
                id
                response {
                  ... on UpdatePrescriptionError {
                    error {
                      __typename
                    }
                  }
                }
              }
              deletePrescriptions {
                id
                response {
                  ... on DeletePrescriptionError {
                    error {
                      __typename
                    }
                  }
                }
              }
            }
          }

        "#;

        let expected = json!({
            "batchPrescription": {
              "insertPrescriptions": null,
              "insertPrescriptionLines": [
                {
                  "id": "id2",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updatePrescriptionLines": [
                {
                  "id": "id3",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deletePrescriptionLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "updatePrescriptions": [
                {
                  "id": "id12",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deletePrescriptions": [
                {
                  "id": "id13",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ]
            }
          }
        );

        let variables = Some(json!({
            "storeId": "n/a",
            "input": {}
        }
        ));

        // Structured Errors
        let test_service = TestService(Box::new(|_| {
            Ok(BatchPrescriptionResult {
                insert_prescription: vec![],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStockOutLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStockOutLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStockOutLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateStockOutLineError::LineDoesNotExist {}),
                }],
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteStockOutLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteStockOutLineError::LineDoesNotExist {}),
                }],
                update_prescription: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdatePrescription| {
                        input.id = "id12".to_string()
                    }),
                    result: Err(UpdatePrescriptionError::InvoiceDoesNotExist {}),
                }],
                delete_prescription: vec![InputWithResult {
                    input: "id13".to_string(),
                    result: Err(DeletePrescriptionError::InvoiceDoesNotExist {}),
                }],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Standard Error
        let test_service = TestService(Box::new(|_| {
            Ok(BatchPrescriptionResult {
                insert_prescription: vec![InputWithResult {
                    input: InsertPrescription {
                        id: "id1".to_string(),
                        patient_id: "id2".to_string(),
                    },
                    result: Err(InsertPrescriptionError::PatientDoesNotExist),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStockOutLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStockOutLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![],
                delete_line: vec![],
                update_prescription: vec![],
                delete_prescription: vec![InputWithResult {
                    input: "id12".to_string(),
                    result: Err(DeletePrescriptionError::NotAPrescriptionInvoice {}),
                }],
            })
        }));
        let expected_message = "Bad user input";

        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Success

        let expected = json!({
            "batchPrescription": {
              "deletePrescriptionLines": null,
              "deletePrescriptions": null,
              "insertPrescriptionLines": null,
              "insertPrescriptions": null,
              "updatePrescriptionLines": [
                {
                  "id": "id3",
                  "response": {
                    "id": "id3"
                  }
                }
              ],
              "updatePrescriptions": null
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(BatchPrescriptionResult {
                insert_prescription: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStockOutLine| {
                        input.id = "id3".to_string();
                        input.r#type = Some(StockOutType::Prescription)
                    }),
                    result: Ok(inline_init(|input: &mut InvoiceLine| {
                        input.invoice_line_row.id = "id3".to_string()
                    })),
                }],
                delete_line: vec![],
                update_prescription: vec![],
                delete_prescription: vec![],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
