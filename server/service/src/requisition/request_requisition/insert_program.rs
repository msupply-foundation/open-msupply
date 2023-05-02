use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    requisition::{common::check_requisition_exists, query::get_requisition},
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use chrono::{NaiveDate, Utc};
use repository::{
    requisition_row::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    ActivityLogType, EqualFilter, MasterListLineFilter, MasterListLineRepository, NumberRowType,
    ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettingsRowRepository,
    ProgramRowRepository, RepositoryError, Requisition, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRowRepository, StorageConnection,
};

use super::{generate_requisition_lines, InsertRequestRequisitionError};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertProgramRequestRequisition {
    pub id: String,
    pub other_party_id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub program_order_type_id: String,
    pub period_id: String,
}

type OutError = InsertRequestRequisitionError;

pub fn insert_program_request_requisition(
    ctx: &ServiceContext,
    input: InsertProgramRequestRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let (new_requisition, requisition_lines) = generate(ctx, input)?;
            RequisitionRowRepository::new(&connection).upsert_one(&new_requisition)?;

            let requisition_line_repo = RequisitionLineRowRepository::new(&connection);
            for requisition_line in requisition_lines {
                requisition_line_repo.upsert_one(&requisition_line)?;
            }

            activity_log_entry(
                &ctx,
                ActivityLogType::RequisitionCreated,
                Some(new_requisition.id.to_owned()),
                None,
            )?;

            get_requisition(ctx, None, &new_requisition.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(requisition)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertProgramRequestRequisition,
) -> Result<(), OutError> {
    if let Some(_) = check_requisition_exists(connection, &input.id)? {
        return Err(OutError::RequisitionAlreadyExists);
    }

    // TODO: Check if we already have reached out max requisitions for this period
    // https://github.com/openmsupply/open-msupply/issues/1599

    // TODO: Check Order Type is valid for this Program
    // https://github.com/openmsupply/open-msupply/issues/1599

    // TODO: Check if the 'other_party' is a valid Program Supplier
    // https://github.com/openmsupply/open-msupply/issues/1599

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OutError::OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OutError::OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    other_party
        .store_id()
        .ok_or(OutError::OtherPartyIsNotAStore)?;

    Ok(())
}

fn generate(
    ctx: &ServiceContext,
    InsertProgramRequestRequisition {
        id,
        other_party_id,
        colour,
        comment,
        their_reference,
        expected_delivery_date,
        program_order_type_id,
        period_id,
    }: InsertProgramRequestRequisition,
) -> Result<(RequisitionRow, Vec<RequisitionLineRow>), RepositoryError> {
    let connection = &ctx.connection;

    // Lookup order type
    let order_type = ProgramRequisitionOrderTypeRowRepository::new(connection)
        .find_one_by_id(&program_order_type_id)?;
    let order_type = match order_type {
        Some(order_type) => order_type,
        None => return Err(RepositoryError::NotFound),
    };

    // Lookup program requisition settings
    // TODO: Use `get_program_requisition_settings` from Service Layer
    // https://github.com/openmsupply/open-msupply/issues/1599
    let program_requisition_settings = ProgramRequisitionSettingsRowRepository::new(connection)
        .find_one_by_id(&order_type.program_requisition_settings_id)?;
    let program_requisition_settings = match program_requisition_settings {
        Some(program_requisition_settings) => program_requisition_settings,
        None => return Err(RepositoryError::NotFound),
    };

    // Lookup program
    let program = ProgramRowRepository::new(connection)
        .find_one_by_id(&program_requisition_settings.program_id)?;
    let program = match program {
        Some(program) => program,
        None => return Err(RepositoryError::NotFound),
    };

    let requisition = RequisitionRow {
        id,
        user_id: Some(ctx.user_id.to_string()),
        requisition_number: next_number(
            connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_id: other_party_id,
        store_id: ctx.store_id.to_owned(),
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: Utc::now().naive_utc(),
        colour,
        comment,
        expected_delivery_date,
        their_reference,
        max_months_of_stock: order_type.max_mos,
        min_months_of_stock: order_type.threshold_mos,
        // Default
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
        is_sync_update: false,
        program_id: Some(program.id),
        period_id: Some(period_id),
        order_type: Some(order_type.name),
    };

    let program_item_ids: Vec<String> = MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&program.master_list_id)),
        )?
        .into_iter()
        .map(|line| line.item_id)
        .collect();

    let requisition_line_rows =
        generate_requisition_lines(ctx, &ctx.store_id, &requisition, program_item_ids)?;

    Ok((requisition, requisition_line_rows))
}

#[cfg(test)]
mod test_insert {
    use crate::{
        requisition::request_requisition::{
            InsertProgramRequestRequisition, InsertRequestRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_master_list_item_query_test1, mock_name_a, mock_name_store_b, mock_name_store_c,
            mock_period, mock_period_schedule_1, mock_request_draft_requisition, mock_store_a,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, NameRow, NameTagRow, NameTagRowRepository, ProgramRequisitionOrderTypeRow,
        ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettingsRow,
        ProgramRequisitionSettingsRowRepository, ProgramRow, ProgramRowRepository,
        RequisitionLineFilter, RequisitionLineRepository, RequisitionRowRepository,
    };
    use util::inline_init;

    #[actix_rt::test]
    async fn insert_program_request_requisition_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_program_request_requisition_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionAlreadyExists
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: mock_request_draft_requisition().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::RequisitionAlreadyExists)
        );

        let name_store_b = mock_name_store_b();
        // OtherPartyNotASupplier
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: "new_program_request_requisition".to_owned(),
                    other_party_id: name_store_b.id.clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: "new_program_request_requisition".to_owned(),
                    other_party_id: not_visible().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: "new_program_request_requisition".to_owned(),
                    other_party_id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyIsNotAStore
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: "new_program_request_requisition".to_owned(),
                    other_party_id: mock_name_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyIsNotAStore)
        );
    }

    #[actix_rt::test]
    async fn insert_program_request_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_program_request_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.requisition_service;

        // Create a Program
        let program_id = mock_master_list_item_query_test1().master_list.id;
        ProgramRowRepository::new(&connection)
            .upsert_one(&ProgramRow {
                id: program_id.clone(),
                name: "program_name".to_owned(),
                master_list_id: program_id.clone(),
            })
            .unwrap();

        // Create a name tag
        NameTagRowRepository::new(&connection)
            .upsert_one(&NameTagRow {
                id: "name_tag_id".to_owned(),
                name: "name_tag_name".to_owned(),
                ..Default::default()
            })
            .unwrap();

        // Create Program Requisition Settings
        ProgramRequisitionSettingsRowRepository::new(&connection)
            .upsert_one(&ProgramRequisitionSettingsRow {
                id: program_id.clone(),
                name_tag_id: "name_tag_id".to_owned(),
                program_id: program_id.clone(),
                period_schedule_id: mock_period_schedule_1().id,

                ..Default::default()
            })
            .unwrap();

        // Create a ProgramOrderType
        ProgramRequisitionOrderTypeRowRepository::new(&connection)
            .upsert_one(&ProgramRequisitionOrderTypeRow {
                id: "program_order_type_id".to_owned(),
                name: "program_order_type_name".to_owned(),
                program_requisition_settings_id: program_id.clone(),
                max_order_per_period: 1,
                ..Default::default()
            })
            .unwrap();

        let result = service
            .insert_program_request_requisition(
                &context,
                InsertProgramRequestRequisition {
                    id: "new_program_request_requisition".to_owned(),
                    other_party_id: mock_name_store_c().id,
                    colour: Some("new colour".to_owned()),
                    their_reference: Some("new their_reference".to_owned()),
                    comment: Some("new comment".to_owned()),
                    expected_delivery_date: Some(NaiveDate::from_ymd_opt(2022, 01, 03).unwrap()),
                    program_order_type_id: "program_order_type_id".to_owned(),
                    period_id: mock_period().id,
                },
            )
            .unwrap();

        let new_row = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();
        let requisition_lines = RequisitionLineRepository::new(&connection)
            .query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&new_row.id)),
            )
            .unwrap();

        assert_eq!(new_row.id, "new_program_request_requisition");
        assert_eq!(new_row.period_id, Some(mock_period().id));
        assert_eq!(
            new_row.order_type,
            Some("program_order_type_name".to_string())
        );
        assert_eq!(new_row.program_id, Some(program_id));
        assert_eq!(requisition_lines.len(), 1);

        // TODO Validate that we can't create more requisitions the `max_order_per_period` in requisition_settings
        // https://github.com/openmsupply/open-msupply/issues/1599
    }
}
