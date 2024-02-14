use repository::{RepositoryError, Requisition, RequisitionLine};

use crate::{
    requisition_line::request_requisition_line::*, service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::*;

#[derive(Clone)]
pub struct BatchRequestRequisition {
    pub insert_requisition: Option<Vec<InsertRequestRequisition>>,
    pub insert_line: Option<Vec<InsertRequestRequisitionLine>>,
    pub update_line: Option<Vec<UpdateRequestRequisitionLine>>,
    pub delete_line: Option<Vec<DeleteRequestRequisitionLine>>,
    pub update_requisition: Option<Vec<UpdateRequestRequisition>>,
    pub delete_requisition: Option<Vec<DeleteRequestRequisition>>,
    pub continue_on_error: Option<bool>,
}

pub type InsertRequisitionsResult = Vec<
    InputWithResult<InsertRequestRequisition, Result<Requisition, InsertRequestRequisitionError>>,
>;

pub type InsertRequisitionLinesResult = Vec<
    InputWithResult<
        InsertRequestRequisitionLine,
        Result<RequisitionLine, InsertRequestRequisitionLineError>,
    >,
>;

pub type UpdateRequisitionLinesResult = Vec<
    InputWithResult<
        UpdateRequestRequisitionLine,
        Result<RequisitionLine, UpdateRequestRequisitionLineError>,
    >,
>;

pub type DeleteRequisitionLinesResult = Vec<
    InputWithResult<
        DeleteRequestRequisitionLine,
        Result<String, DeleteRequestRequisitionLineError>,
    >,
>;

pub type UpdateRequisitionsResult = Vec<
    InputWithResult<UpdateRequestRequisition, Result<Requisition, UpdateRequestRequisitionError>>,
>;

pub type DeleteRequisitionsResult =
    Vec<InputWithResult<DeleteRequestRequisition, Result<String, DeleteRequestRequisitionError>>>;

#[derive(Debug, Default)]
pub struct BatchRequestRequisitionResult {
    pub insert_requisition: InsertRequisitionsResult,
    pub insert_line: InsertRequisitionLinesResult,
    pub update_line: UpdateRequisitionLinesResult,
    pub delete_line: DeleteRequisitionLinesResult,
    pub update_requisition: UpdateRequisitionsResult,
    pub delete_requisition: DeleteRequisitionsResult,
}

pub fn batch_request_requisition(
    ctx: &ServiceContext,
    input: BatchRequestRequisition,
) -> Result<BatchRequestRequisitionResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchRequestRequisitionResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);

            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_requisition, insert_request_requisition);
            results.insert_requisition = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations(input.insert_line, insert_request_requisition_line);
            results.insert_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations(input.update_line, update_request_requisition_line);
            results.update_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations(input.delete_line, delete_request_requisition_line);
            results.delete_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations(input.update_requisition, update_request_requisition);
            results.update_requisition = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor
                .do_mutations(input.delete_requisition, delete_request_requisition);
            results.delete_requisition = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results)
                as Result<BatchRequestRequisitionResult, WithDBError<BatchRequestRequisitionResult>>
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_full_draft_response_requisition_for_update_test, mock_item_a, mock_name_store_c,
            mock_store_a, MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository, RequisitionRowRepository,
    };
    use util::inline_init;

    use crate::{
        requisition::request_requisition::{
            BatchRequestRequisition, DeleteRequestRequisition, DeleteRequestRequisitionError,
            InsertRequestRequisition,
        },
        requisition_line::request_requisition_line::InsertRequestRequisitionLine,
        service_provider::ServiceProvider,
        InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_request_requisition_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_request_requisition_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let delete_requisition_input = inline_init(|input: &mut DeleteRequestRequisition| {
            input.id = mock_full_draft_response_requisition_for_update_test()
                .requisition
                .id;
        });

        let mut input = BatchRequestRequisition {
            insert_requisition: Some(vec![inline_init(|input: &mut InsertRequestRequisition| {
                input.id = "new_id".to_string();
                input.other_party_id = mock_name_store_c().id;
            })]),
            insert_line: Some(vec![inline_init(
                |input: &mut InsertRequestRequisitionLine| {
                    input.requisition_id = "new_id".to_string();
                    input.id = "new_line_id".to_string();
                    input.item_id = mock_item_a().id;
                },
            )]),
            update_line: None,
            delete_line: None,
            update_requisition: None,
            delete_requisition: Some(vec![delete_requisition_input.clone()]),
            continue_on_error: None,
        };

        // Test rollback
        let result = service
            .batch_request_requisition(&context, input.clone())
            .unwrap();

        assert_eq!(
            result.delete_requisition,
            vec![InputWithResult {
                input: delete_requisition_input,
                result: Err(DeleteRequestRequisitionError::NotARequestRequisition {})
            }]
        );

        assert_eq!(
            RequisitionRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_eq!(
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );

        // Test no rollback
        input.continue_on_error = Some(true);

        service.batch_request_requisition(&context, input).unwrap();

        assert_ne!(
            RequisitionRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_ne!(
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );
    }
}
