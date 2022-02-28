use repository::{OkWithRollback, RepositoryError, Requisition, RequisitionLine};

use crate::{
    requisition_line::request_requisition_line::{
        delete_request_requisition_line, insert_request_requisition_line,
        update_request_requisition_line, DeleteRequestRequisitionLine,
        DeleteRequestRequisitionLineError, InsertRequestRequisitionLine,
        InsertRequestRequisitionLineError, UpdateRequestRequisitionLine,
        UpdateRequestRequisitionLineError,
    },
    service_provider::ServiceContext,
    InputWithResult,
};

use super::{
    delete_request_requisition, insert_request_requisition, update_request_requisition,
    DeleteRequestRequisition, DeleteRequestRequisitionError, InsertRequestRequisition,
    InsertRequestRequisitionError, UpdateRequestRequisition, UpdateRequestRequisitionError,
};

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

#[derive(Debug)]
pub struct BatchRequestRequisitionResult {
    pub insert_requisition: Vec<
        InputWithResult<
            InsertRequestRequisition,
            Result<Requisition, InsertRequestRequisitionError>,
        >,
    >,
    pub insert_line: Vec<
        InputWithResult<
            InsertRequestRequisitionLine,
            Result<RequisitionLine, InsertRequestRequisitionLineError>,
        >,
    >,
    pub update_line: Vec<
        InputWithResult<
            UpdateRequestRequisitionLine,
            Result<RequisitionLine, UpdateRequestRequisitionLineError>,
        >,
    >,
    pub delete_line: Vec<
        InputWithResult<
            DeleteRequestRequisitionLine,
            Result<String, DeleteRequestRequisitionLineError>,
        >,
    >,
    pub update_requisition: Vec<
        InputWithResult<
            UpdateRequestRequisition,
            Result<Requisition, UpdateRequestRequisitionError>,
        >,
    >,
    pub delete_requisition: Vec<
        InputWithResult<DeleteRequestRequisition, Result<String, DeleteRequestRequisitionError>>,
    >,
}

pub struct DoMutationResult<T> {
    pub has_errors: bool,
    pub results: Vec<T>,
}

pub fn do_mutations<I, R, E, M>(
    ctx: &ServiceContext,
    store_id: &str,
    inputs: Vec<I>,
    mutation: M,
) -> (bool, Vec<InputWithResult<I, Result<R, E>>>)
where
    I: Clone,
    M: Fn(&ServiceContext, &str, I) -> Result<R, E>,
{
    let mut has_errors = false;
    let mut results = vec![];

    for input in inputs {
        let mutation_result = mutation(ctx, store_id, input.clone());
        has_errors = mutation_result.is_err();
        results.push(InputWithResult {
            input,
            result: mutation_result,
        });
    }

    (has_errors, results)
}

pub fn batch_request_requisition(
    ctx: &ServiceContext,
    store_id: &str,
    input: BatchRequestRequisition,
) -> Result<BatchRequestRequisitionResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync_with_rollback(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut result = BatchRequestRequisitionResult {
                insert_requisition: vec![],
                insert_line: vec![],
                update_line: vec![],
                delete_line: vec![],
                update_requisition: vec![],
                delete_requisition: vec![],
            };

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_requisition.unwrap_or(vec![]),
                insert_request_requisition,
            );
            result.insert_requisition = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_line.unwrap_or(vec![]),
                insert_request_requisition_line,
            );
            result.insert_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_line.unwrap_or(vec![]),
                update_request_requisition_line,
            );
            result.update_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_line.unwrap_or(vec![]),
                delete_request_requisition_line,
            );
            result.delete_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }
            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_requisition.unwrap_or(vec![]),
                update_request_requisition,
            );
            result.update_requisition = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_requisition.unwrap_or(vec![]),
                delete_request_requisition,
            );
            result.delete_requisition = results;

            let result: Result<OkWithRollback<BatchRequestRequisitionResult>, RepositoryError> =
                if has_error && !continue_on_error {
                    Ok(OkWithRollback::OkWithRollback(result))
                } else {
                    Ok(OkWithRollback::Ok(result))
                };

            result
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_response_requisition_for_update_test, mock_item_stats_item2,
            mock_name_store_c, MockDataInserts,
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let delete_requisition_input = inline_init(|input: &mut DeleteRequestRequisition| {
            input.id = mock_draft_response_requisition_for_update_test().id;
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
                    input.item_id = mock_item_stats_item2().id;
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
            .batch_request_requisition(&context, "store_a", input.clone())
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

        service
            .batch_request_requisition(&context, "store_a", input)
            .unwrap();

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
