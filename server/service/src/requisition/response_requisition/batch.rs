use repository::RepositoryError;

use crate::{
    requisition_line::response_requisition_line::*, service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};

#[derive(Clone)]
pub struct BatchResponseRequisition {
    pub delete_line: Option<Vec<DeleteResponseRequisitionLine>>,
    pub continue_on_error: Option<bool>,
}

pub type DeleteRequisitionLinesResult = Vec<
    InputWithResult<
        DeleteResponseRequisitionLine,
        Result<String, DeleteResponseRequisitionLineError>,
    >,
>;

#[derive(Debug, Default)]
pub struct BatchResponseRequisitionResult {
    pub delete_line: DeleteRequisitionLinesResult,
}

pub fn batch_response_requisition(
    ctx: &ServiceContext,
    input: BatchResponseRequisition,
) -> Result<BatchResponseRequisitionResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchResponseRequisitionResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);

            let (has_errors, result) = mutations_processor
                .do_mutations(input.delete_line, delete_response_requisition_line);
            results.delete_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results)
                as Result<
                    BatchResponseRequisitionResult,
                    WithDBError<BatchResponseRequisitionResult>,
                >
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
            mock_full_draft_response_requisition_for_update_test, mock_store_a, MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        requisition::response_requisition::BatchResponseRequisition,
        requisition_line::response_requisition_line::DeleteResponseRequisitionLine,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn batch_response_requisition_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_response_requisition_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let line_id = mock_full_draft_response_requisition_for_update_test().lines[0]
            .id
            .clone();

        let delete_requisition_lines_input = BatchResponseRequisition {
            delete_line: Some(vec![inline_init(
                |input: &mut DeleteResponseRequisitionLine| input.id = line_id.clone(),
            )]),
            continue_on_error: None,
        };

        assert_eq!(
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id(&line_id)
                .unwrap(),
            Some(mock_full_draft_response_requisition_for_update_test().lines[0].clone())
        );

        // Test delete

        service
            .batch_response_requisition(&context, delete_requisition_lines_input)
            .unwrap();

        assert_eq!(
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id(&line_id)
                .unwrap(),
            None
        );
    }
}
