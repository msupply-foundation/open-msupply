use crate::{
    activity_log::activity_log_entry,
    backend_plugin::plugin_provider::PluginError,
    number::next_number,
    requisition::{
        common::{
            check_exceeded_max_orders_for_period, check_requisition_row_exists,
            default_indicator_value, indicator_value_type, CheckExceededOrdersForPeriod,
        },
        program_indicator::query::{program_indicators, ProgramIndicator},
        program_settings::get_supplier_program_requisition_settings,
        query::get_requisition,
        response_requisition::GenerateResult,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
    PluginOrRepositoryError,
};
use chrono::{NaiveDate, Utc};
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, EqualFilter, IndicatorValueRow, IndicatorValueRowRepository,
    IndicatorValueType, MasterListLineFilter, MasterListLineRepository, NameFilter, NameRepository,
    NumberRowType, Pagination, ProgramIndicatorFilter, ProgramRequisitionOrderTypeRow, ProgramRow,
    RepositoryError, Requisition, RequisitionLineRowRepository, RequisitionRowRepository,
    StorageConnection, StoreFilter, StoreRepository,
};
use util::uuid::uuid;

use super::generate_requisition_lines;

#[derive(Debug, PartialEq)]
pub enum InsertProgramRequestRequisitionError {
    RequisitionAlreadyExists,
    // Name validation
    SupplierNotValid,
    // Program validation
    ProgramOrderTypeDoesNotExist,
    MaxOrdersReachedForPeriod,
    // Internal
    NewlyCreatedRequisitionDoesNotExist,
    PluginError(PluginError),
    DatabaseError(RepositoryError),
}

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

type OutError = InsertProgramRequestRequisitionError;

pub fn insert_program_request_requisition(
    ctx: &ServiceContext,
    input: InsertProgramRequestRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let (program, order_type) = validate(ctx, &input)?;
            let GenerateResult {
                requisition: new_requisition,
                requisition_lines,
                indicator_values,
            } = generate(ctx, program, order_type, input)?;
            RequisitionRowRepository::new(connection).upsert_one(&new_requisition)?;

            let requisition_line_repo = RequisitionLineRowRepository::new(connection);
            for requisition_line in requisition_lines {
                requisition_line_repo.upsert_one(&requisition_line)?;
            }

            let indicator_value_repo = IndicatorValueRowRepository::new(connection);
            for indicator_value in indicator_values {
                indicator_value_repo.upsert_one(&indicator_value)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::RequisitionCreated,
                Some(new_requisition.id.to_string()),
                None,
                None,
            )?;

            get_requisition(ctx, None, &new_requisition.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(requisition)
}

fn validate(
    ctx: &ServiceContext,
    input: &InsertProgramRequestRequisition,
) -> Result<(ProgramRow, ProgramRequisitionOrderTypeRow), OutError> {
    let connection = &ctx.connection;

    if (check_requisition_row_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionAlreadyExists);
    }

    let program_settings = get_supplier_program_requisition_settings(ctx, &ctx.store_id)?;

    let (program_setting, order_type) = program_settings
        .iter()
        .find_map(|setting| {
            setting
                .order_types
                .iter()
                .find(|order_type| order_type.order_type.id == input.program_order_type_id)
                .map(|order_type| (setting, order_type))
        })
        .ok_or(OutError::ProgramOrderTypeDoesNotExist)?;

    if order_type.available_periods.is_empty() {
        return Err(OutError::MaxOrdersReachedForPeriod);
    }

    if !program_setting
        .suppliers
        .iter()
        .any(|supplier| supplier.supplier.name_row.id == input.other_party_id)
    {
        return Err(OutError::SupplierNotValid);
    }

    if check_exceeded_max_orders_for_period(
        connection,
        CheckExceededOrdersForPeriod {
            program_id: &program_setting.program_requisition_settings.program_row.id,
            period_id: &input.period_id,
            program_order_type_id: &input.program_order_type_id,
            max_orders_per_period: i64::from(order_type.order_type.max_order_per_period),
            requisition_type: RequisitionType::Request,
            other_party_id: None,
        },
    )? {
        return Err(OutError::MaxOrdersReachedForPeriod);
    }

    Ok((
        program_setting
            .program_requisition_settings
            .program_row
            .clone(),
        order_type.order_type.clone(),
    ))
}

fn generate(
    ctx: &ServiceContext,
    program: ProgramRow,
    order_type: ProgramRequisitionOrderTypeRow,
    InsertProgramRequestRequisition {
        id,
        other_party_id,
        colour,
        comment,
        their_reference,
        expected_delivery_date,
        program_order_type_id: _,
        period_id,
    }: InsertProgramRequestRequisition,
) -> Result<GenerateResult, PluginOrRepositoryError> {
    let connection = &ctx.connection;

    let requisition = RequisitionRow {
        id,
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::RequestRequisition,
            &ctx.store_id,
        )?,
        name_link_id: other_party_id.clone(),
        store_id: ctx.store_id.clone(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: Utc::now().naive_utc(),
        colour,
        comment,
        expected_delivery_date,
        their_reference,
        max_months_of_stock: order_type.max_mos,
        min_months_of_stock: order_type.threshold_mos,
        program_id: Some(program.id.clone()),
        period_id: Some(period_id.clone()),
        order_type: Some(order_type.name),
        is_emergency: order_type.is_emergency,
        // Default
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
    };

    let master_list_id = program.master_list_id.clone().unwrap_or_default();

    let program_item_ids: Vec<String> = MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(&master_list_id)),
        )?
        .into_iter()
        .map(|line| line.item_id)
        .collect();

    let requisition_lines =
        generate_requisition_lines(ctx, &ctx.store_id, &requisition, program_item_ids)?;

    let program_indicators = program_indicators(
        connection,
        Pagination::all(),
        None,
        Some(ProgramIndicatorFilter::new().program_id(EqualFilter::equal_to(&program.id))),
    )?;

    let customer_name_id = StoreRepository::new(connection)
        .query_by_filter(StoreFilter::new().id(EqualFilter::equal_to(&ctx.store_id)))?
        .pop()
        .ok_or(RepositoryError::NotFound)?
        .name_row
        .id;

    let indicator_values = if !order_type.is_emergency {
        generate_program_indicator_values(
            connection,
            &ctx.store_id,
            &period_id,
            program_indicators,
            &customer_name_id,
        )?
    } else {
        vec![]
    };

    Ok(GenerateResult {
        requisition,
        requisition_lines,
        indicator_values,
    })
}

fn generate_program_indicator_values(
    connection: &StorageConnection,
    store_id: &str,
    period_id: &str,
    program_indicators: Vec<ProgramIndicator>,
    customer_name_id: &str,
) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
    let store_pref = get_store_preferences(connection, store_id)?;
    let customer_name_ids: Vec<String> = NameRepository::new(connection)
        .query(
            store_id,
            Pagination::all(),
            Some(
                NameFilter::new()
                    .supplying_store_id(EqualFilter::equal_to(store_id))
                    .is_customer(true),
            ),
            None,
        )?
        .into_iter()
        .map(|name| name.name_row.id)
        .collect();

    let indicator_line_ids = program_indicators
        .iter()
        .flat_map(|program_indicator| {
            program_indicator
                .lines
                .iter()
                .map(|line| line.line.id.clone())
        })
        .collect::<Vec<String>>();
    let indicator_column_ids = program_indicators
        .iter()
        .flat_map(|program_indicator| {
            program_indicator
                .lines
                .iter()
                .flat_map(|line| line.columns.iter().map(|column| column.id.clone()))
        })
        .collect::<Vec<String>>();

    let customer_values = IndicatorValueRepository::new(connection).query_by_filter(
        IndicatorValueFilter::new()
            .period_id(EqualFilter::equal_to(period_id))
            .indicator_line_id(EqualFilter::equal_any(indicator_line_ids))
            .indicator_column_id(EqualFilter::equal_any(indicator_column_ids))
            .customer_name_id(EqualFilter::equal_any(customer_name_ids.clone())),
    )?;

    let mut indicator_values = vec![];

    for program_indicator in program_indicators {
        for line in program_indicator.lines {
            for column in line.columns.clone() {
                let value_type = indicator_value_type(&line.line, &column);
                let value = if store_pref
                    .use_consumption_and_stock_from_customers_for_internal_orders
                    && value_type == &Some(IndicatorValueType::Number)
                    && !customer_name_ids.is_empty()
                {
                    customer_values
                        .iter()
                        .filter(|v| {
                            v.indicator_value_row.indicator_line_id == line.line.id
                                && v.indicator_value_row.indicator_column_id == column.id
                        })
                        .map(|v| {
                            v.indicator_value_row
                                .value
                                .parse::<f64>()
                                .unwrap_or_default()
                        })
                        .sum::<f64>()
                        .to_string()
                } else {
                    default_indicator_value(&line.line, &column)
                };

                let indicator_value = IndicatorValueRow {
                    id: uuid(),
                    customer_name_link_id: customer_name_id.to_string(),
                    store_id: store_id.to_string(),
                    period_id: period_id.to_string(),
                    indicator_line_id: line.line.id.to_string(),
                    indicator_column_id: column.id.to_string(),
                    value,
                };

                indicator_values.push(indicator_value);
            }
        }
    }

    Ok(indicator_values)
}

impl From<RepositoryError> for InsertProgramRequestRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertProgramRequestRequisitionError::DatabaseError(error)
    }
}

impl From<PluginOrRepositoryError> for InsertProgramRequestRequisitionError {
    fn from(error: PluginOrRepositoryError) -> Self {
        use InsertProgramRequestRequisitionError as to;
        use PluginOrRepositoryError as from;
        match error {
            from::RepositoryError(repository_error) => repository_error.into(),
            from::PluginError(plugin_error) => to::PluginError(plugin_error),
        }
    }
}

#[cfg(test)]
mod test_insert {
    use crate::{
        requisition::request_requisition::{
            InsertProgramRequestRequisition, InsertProgramRequestRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_name_store_b, mock_period, mock_program_a, mock_program_order_types_a,
            mock_request_draft_requisition, mock_user_account_a, program_master_list_store,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, NameRow, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionRowRepository,
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(program_master_list_store().id, mock_user_account_a().id)
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

        // ProgramOrderTypeDoesNotExist
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                inline_init(|r: &mut InsertProgramRequestRequisition| {
                    r.id = "new_program_request_requisition".to_string();
                    r.other_party_id.clone_from(&mock_name_store_b().id);
                    r.program_order_type_id = "does_not_exist".to_string();
                    r.period_id = mock_period().id;
                })
            ),
            Err(ServiceError::ProgramOrderTypeDoesNotExist)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                inline_init(|r: &mut InsertProgramRequestRequisition| {
                    r.id = "new_program_request_requisition".to_string();
                    r.other_party_id = "invalid".to_string();
                    r.program_order_type_id = mock_program_order_types_a().id;
                    r.period_id = mock_period().id;
                })
            ),
            Err(ServiceError::SupplierNotValid)
        );
    }

    #[actix_rt::test]
    async fn insert_program_request_requisition_success_service() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_program_request_requisition_success_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(program_master_list_store().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .insert_program_request_requisition(
                &context,
                inline_init(|r: &mut InsertProgramRequestRequisition| {
                    r.id = "new_program_request_requisition".to_string();
                    r.other_party_id.clone_from(&mock_name_store_b().id);
                    r.program_order_type_id = mock_program_order_types_a().id;
                    r.period_id = mock_period().id;
                }),
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
        assert_eq!(new_row.order_type, Some(mock_program_order_types_a().id));
        assert_eq!(new_row.program_id, Some(mock_program_a().id));
        assert_eq!(requisition_lines.len(), 1);

        // Error: MaxOrdersReachedForPeriod
        assert_eq!(
            service.insert_program_request_requisition(
                &context,
                inline_init(|r: &mut InsertProgramRequestRequisition| {
                    r.id = "error_program_requisition".to_string();
                    r.other_party_id.clone_from(&mock_name_store_b().id);
                    r.program_order_type_id = mock_program_order_types_a().id;
                    r.period_id = mock_period().id;
                }),
            ),
            Err(ServiceError::MaxOrdersReachedForPeriod)
        );
    }
}
