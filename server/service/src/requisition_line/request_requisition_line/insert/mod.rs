use crate::{
    backend_plugin::{
        plugin_provider::{PluginError, PluginInstance},
        types::transform_request_requisition_lines::Context,
    },
    requisition_line::query::get_requisition_line,
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};
use repository::{
    PluginDataRowRepository, RepositoryError, RequisitionLine, RequisitionLineRowRepository,
};

mod generate;
mod validate;
use generate::generate;
use validate::validate;

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertRequestRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
}

#[derive(Debug, PartialEq)]

pub enum InsertRequestRequisitionLineError {
    RequisitionLineAlreadyExists,
    ItemAlreadyExistInRequisition,
    ItemDoesNotExist,
    // TODO  ItemIsNotVisibleInThisStore,
    CannotAddItemToProgramRequisition,
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    PluginError(PluginError),
    DatabaseError(RepositoryError),
    // Should never happen
    CannotFindItemStatusForRequisitionLine,
    NewlyCreatedRequisitionLineDoesNotExist,
}

type OutError = InsertRequestRequisitionLineError;

pub fn insert_request_requisition_line(
    ctx: &ServiceContext,
    input: InsertRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let lines = vec![generate(ctx, &ctx.store_id, &requisition_row, input)?];

            // Plugin
            let (mut lines, plugin_data_rows) =
                PluginInstance::transform_request_requisition_lines(
                    Context::InsertRequestRequisitionLine,
                    lines,
                    &requisition_row,
                )
                .map_err(OutError::PluginError)?;
            let plugin_data_repository = PluginDataRowRepository::new(connection);
            for plugin_data in plugin_data_rows {
                plugin_data_repository.upsert_one(&plugin_data)?;
            }

            let new_requisition_line_row = lines
                .pop()
                .ok_or(OutError::CannotFindItemStatusForRequisitionLine)?;
            RequisitionLineRowRepository::new(connection).upsert_one(&new_requisition_line_row)?;

            get_requisition_line(ctx, &new_requisition_line_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

impl From<RepositoryError> for InsertRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        InsertRequestRequisitionLineError::DatabaseError(error)
    }
}

impl From<PluginOrRepositoryError> for InsertRequestRequisitionLineError {
    fn from(error: PluginOrRepositoryError) -> Self {
        use InsertRequestRequisitionLineError as to;
        use PluginOrRepositoryError as from;
        match error {
            from::RepositoryError(repository_error) => repository_error.into(),
            from::PluginError(plugin_error) => to::PluginError(plugin_error),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_full_new_response_requisition_for_update_test, mock_item_c,
            mock_request_draft_requisition, mock_request_draft_requisition_calculation_test,
            mock_request_program_requisition, mock_sent_request_requisition, mock_store_a,
            mock_store_b, test_item_stats, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        RequisitionLineRow, RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::request_requisition_line::{
            InsertRequestRequisitionLine, InsertRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_request_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_request_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineAlreadyExists
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionLineAlreadyExists)
        );

        // ItemAlreadyExistInRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id
                        .clone(),
                    id: "new requisition line id".to_string(),
                    item_id: mock_request_draft_requisition_calculation_test().lines[0]
                        .item_id
                        .clone(),
                },
            ),
            Err(ServiceError::ItemAlreadyExistInRequisition)
        );

        // RequisitionDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_sent_request_requisition().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_full_new_response_requisition_for_update_test()
                        .requisition
                        .id
                        .clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id
                        .clone(),
                    item_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemDoesNotExist)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_draft_request_requisition_for_update_test().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotAddItemToProgramRequisition
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    id: "some mock program line".to_string(),
                    requisition_id: mock_request_program_requisition().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotAddItemToProgramRequisition),
        )
    }

    #[actix_rt::test]
    async fn insert_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_request_requisition_line_success",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        service
            .insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    id: "new requisition line id".to_string(),
                    item_id: test_item_stats::item2().id,
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id("new requisition line id")
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            RequisitionLineRow {
                available_stock_on_hand: test_item_stats::item_2_soh(),
                average_monthly_consumption: test_item_stats::item2_amc_3_months(),
                suggested_quantity: (test_item_stats::item2_amc_3_months() * 10.0
                    - test_item_stats::item_2_soh())
                .ceil(),
                ..line.clone()
            }
        );

        // Check with item_c which exists in another requisition
        let result = service.insert_request_requisition_line(
            &context,
            InsertRequestRequisitionLine {
                requisition_id: mock_request_draft_requisition().id.clone(),
                id: "new requisition line id2".to_string(),
                item_id: mock_item_c().id.clone(),
            },
        );

        assert!(result.is_ok());
    }
}
