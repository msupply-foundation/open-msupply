use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    pricing::item_price::{get_pricing_for_items, ItemPriceLookup},
    requisition::{
        common::{
            check_exceeded_max_orders_for_period, check_requisition_row_exists,
            default_indicator_value, get_indicative_price_pref, CheckExceededOrdersForPeriod,
        },
        program_indicator::query::{program_indicators, ProgramIndicator},
        program_settings::get_program_requisition_settings_by_customer,
        query::get_requisition,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, EqualFilter, IndicatorValueRow, IndicatorValueRowRepository, ItemFilter,
    ItemRepository, MasterListLineFilter, MasterListLineRepository, NumberRowType, Pagination,
    ProgramIndicatorFilter, ProgramRequisitionOrderTypeRow, ProgramRow, RepositoryError,
    Requisition, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRowRepository,
    StoreFilter, StoreRepository,
};
use util::uuid::uuid;

#[derive(Debug, PartialEq)]
pub enum InsertProgramResponseRequisitionError {
    RequisitionAlreadyExists,
    // Name validation
    CustomerNotValid,
    // Program validation
    ProgramOrderTypeDoesNotExist,
    MaxOrdersReachedForPeriod,
    NoProgramsExistForCustomer,
    // Internal
    NewlyCreatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertProgramResponseRequisition {
    pub id: String,
    pub other_party_id: String,
    pub program_order_type_id: String,
    pub period_id: String,
}

type OutError = InsertProgramResponseRequisitionError;

pub fn insert_program_response_requisition(
    ctx: &ServiceContext,
    input: InsertProgramResponseRequisition,
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

            if !indicator_values.is_empty() {
                let indicator_value_repo = IndicatorValueRowRepository::new(connection);
                for indicator_value in indicator_values {
                    indicator_value_repo.upsert_one(&indicator_value)?;
                }
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
    input: &InsertProgramResponseRequisition,
) -> Result<(ProgramRow, ProgramRequisitionOrderTypeRow), OutError> {
    let connection = &ctx.connection;

    if (check_requisition_row_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionAlreadyExists);
    }

    let program_settings =
        get_program_requisition_settings_by_customer(ctx, &input.other_party_id)?;

    if !program_settings.program_settings.len() == 0 {
        return Err(OutError::NoProgramsExistForCustomer);
    }

    let (master_list, order_type) = program_settings
        .program_settings
        .iter()
        .find_map(|master_list| {
            master_list
                .order_types
                .iter()
                .find(|order_type| order_type.id == input.program_order_type_id)
                .map(|order_type| (master_list, order_type))
        })
        .ok_or(OutError::ProgramOrderTypeDoesNotExist)?;

    if order_type.available_periods.is_empty() {
        return Err(OutError::MaxOrdersReachedForPeriod);
    }

    if check_exceeded_max_orders_for_period(
        connection,
        CheckExceededOrdersForPeriod {
            program_id: &master_list.program_id,
            period_id: &input.period_id,
            program_order_type_id: &input.program_order_type_id,
            max_orders_per_period: i64::from(order_type.max_order_per_period),
            requisition_type: RequisitionType::Response,
            store_id: &ctx.store_id,
            other_party_id: Some(&input.other_party_id),
        },
    )? {
        return Err(OutError::MaxOrdersReachedForPeriod);
    }

    Ok((
        ProgramRow {
            id: master_list.program_id.clone(),
            name: master_list.program_name.clone(),
            master_list_id: Some(master_list.master_list_id.clone()),
            // Add other fields as required based on ProgramRow definition
            ..Default::default()
        },
        ProgramRequisitionOrderTypeRow {
            id: order_type.id.clone(),
            name: order_type.name.clone(),
            max_order_per_period: order_type.max_order_per_period,
            max_mos: order_type.max_mos,
            threshold_mos: order_type.threshold_mos,
            is_emergency: order_type.is_emergency,
            // Add other fields as required based on ProgramRequisitionOrderTypeRow definition
            ..Default::default()
        },
    ))
}

pub(super) struct GenerateResult {
    pub(crate) requisition: RequisitionRow,
    pub(crate) requisition_lines: Vec<RequisitionLineRow>,
    pub(crate) indicator_values: Vec<IndicatorValueRow>,
}

fn generate(
    ctx: &ServiceContext,
    program: ProgramRow,
    order_type: ProgramRequisitionOrderTypeRow,
    InsertProgramResponseRequisition {
        id,
        other_party_id,
        program_order_type_id: _,
        period_id,
    }: InsertProgramResponseRequisition,
) -> Result<GenerateResult, RepositoryError> {
    let connection = &ctx.connection;
    let requisition = RequisitionRow {
        id,
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::ResponseRequisition,
            &ctx.store_id,
        )?,
        name_link_id: other_party_id.clone(),
        store_id: ctx.store_id.clone(),
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: Utc::now().naive_utc(),
        max_months_of_stock: order_type.max_mos,
        min_months_of_stock: order_type.threshold_mos,
        program_id: Some(program.id.clone()),
        period_id: Some(period_id.clone()),
        order_type: Some(order_type.name),
        is_emergency: order_type.is_emergency,
        // Default
        colour: None,
        comment: None,
        expected_delivery_date: None,
        their_reference: None,
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
        created_from_requisition_id: None,
        original_customer_id: None,
    };

    let master_list_id = program.master_list_id.clone().unwrap_or_default();

    let program_item_ids: Vec<String> = MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(master_list_id.to_string())),
            None,
        )?
        .into_iter()
        .map(|line| line.item_id)
        .collect();

    let requisition_lines = generate_lines(ctx, &ctx.store_id, &requisition, program_item_ids)?;

    let program_indicators = if !order_type.is_emergency {
        program_indicators(
            connection,
            Pagination::all(),
            None,
            Some(
                ProgramIndicatorFilter::new()
                    .program_id(EqualFilter::equal_to(program.id.to_string())),
            ),
        )?
    } else {
        vec![]
    };

    let customer_store = StoreRepository::new(connection)
        .query_one(StoreFilter::new().name_id(EqualFilter::equal_to(other_party_id.to_string())))?;

    let indicator_values = match customer_store {
        Some(_) => generate_program_indicator_values(
            &ctx.store_id,
            &period_id,
            &other_party_id,
            program_indicators,
        ),
        None => vec![],
    };

    Ok(GenerateResult {
        requisition,
        requisition_lines,
        indicator_values,
    })
}

fn generate_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let items = ItemRepository::new(&ctx.connection).query_by_filter(
        ItemFilter::new().id(EqualFilter::equal_any(item_ids)),
        Some(store_id.to_string()),
    )?;

    let populate_price_per_unit = get_indicative_price_pref(&ctx.connection)?;
    let price_list = if populate_price_per_unit {
        Some(get_pricing_for_items(
            &ctx.connection,
            ItemPriceLookup {
                item_ids: items.iter().map(|i| i.item_row.id.to_string()).collect(),
                customer_name_id: None,
            },
        )?)
    } else {
        None
    };

    let result = items
        .into_iter()
        .map(|item| {
            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item.item_row.id.clone(),
                item_name: item.item_row.name.clone(),
                snapshot_datetime: Some(Utc::now().naive_utc()),
                price_per_unit: if let Some(price_list) = &price_list {
                    price_list
                        .get(&item.item_row.id)
                        .cloned()
                        .unwrap_or_default()
                        .calculated_price_per_unit
                } else {
                    None
                },
                // Default
                suggested_quantity: 0.0,
                available_stock_on_hand: 0.0,
                average_monthly_consumption: 0.0,
                comment: None,
                supply_quantity: 0.0,
                requested_quantity: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
                initial_stock_on_hand_units: 0.0,
                incoming_units: 0.0,
                outgoing_units: 0.0,
                loss_in_units: 0.0,
                addition_in_units: 0.0,
                expiring_units: 0.0,
                days_out_of_stock: 0.0,
                option_id: None,
                available_volume: None,
                location_type_id: None,
            }
        })
        .collect();

    Ok(result)
}

fn generate_program_indicator_values(
    store_id: &str,
    period_id: &str,
    customer_name_id: &str,
    program_indicators: Vec<ProgramIndicator>,
) -> Vec<IndicatorValueRow> {
    let mut indicator_values = vec![];

    for program_indicator in program_indicators {
        for line in program_indicator.lines {
            for column in line.columns {
                let indicator_value = IndicatorValueRow {
                    id: uuid(),
                    customer_name_link_id: customer_name_id.to_string(),
                    store_id: store_id.to_string(),
                    period_id: period_id.to_string(),
                    value: default_indicator_value(&line.line, &column),
                    indicator_line_id: line.line.id.to_string(),
                    indicator_column_id: column.id.to_string(),
                };
                indicator_values.push(indicator_value);
            }
        }
    }

    indicator_values
}

impl From<RepositoryError> for InsertProgramResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertProgramResponseRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_name_store_a, mock_name_store_b, mock_name_store_c, mock_store_a, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        ContextRow, MasterListNameJoinRow, MasterListRow, NameStoreJoinRow, NameTagJoinRow,
        NameTagRow, PeriodRow, PeriodScheduleRow, ProgramRequisitionOrderTypeRow,
        ProgramRequisitionSettingsRow, ProgramRow,
    };

    use crate::test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext};

    use super::{InsertProgramResponseRequisition, InsertProgramResponseRequisitionError};

    #[actix_rt::test]
    async fn get_customer_program_requisition_settings() {
        // Mock Data

        // Two tags for store a
        let name_tag1 = NameTagRow {
            id: "name_tag1".to_string(),
            ..Default::default()
        };
        let name_tag_join1 = NameTagJoinRow {
            id: "name_tag_join1".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_a().id,
        };
        let name_tag2 = NameTagRow {
            id: "name_tag2".to_string(),
            ..Default::default()
        };
        let name_tag_join2 = NameTagJoinRow {
            id: "name_tag_join2".to_string(),
            name_tag_id: name_tag2.id.clone(),
            name_link_id: mock_name_store_a().id,
        };

        // Two programs, with master list both joined to store a
        let master_list1 = MasterListRow {
            id: "master_list1".to_string(),
            is_active: true,
            ..Default::default()
        };
        let master_list_name_join1 = MasterListNameJoinRow {
            id: "master_list_name_join1".to_string(),
            name_link_id: mock_name_store_a().id,
            master_list_id: master_list1.id.clone(),
        };
        let context1 = ContextRow {
            id: "program1".to_string(),
            name: "program1".to_string(),
        };
        let program1 = ProgramRow {
            id: "program1".to_string(),
            master_list_id: Some(master_list1.id.clone()),
            context_id: context1.id.clone(),
            ..Default::default()
        };
        let master_list2 = MasterListRow {
            id: "master_list2".to_string(),
            is_active: true,
            ..Default::default()
        };
        let master_list_name_join2 = MasterListNameJoinRow {
            id: "master_list_name_join2".to_string(),
            name_link_id: mock_name_store_a().id,
            master_list_id: master_list2.id.clone(),
        };
        let context2 = ContextRow {
            id: "program2".to_string(),
            name: "program2".to_string(),
        };
        let program2 = ProgramRow {
            id: "program2".to_string(),
            master_list_id: Some(master_list2.id.clone()),
            context_id: context2.id.clone(),
            ..Default::default()
        };

        // Two periods schedules with two periods
        let period_schedule1 = PeriodScheduleRow {
            id: "period_schedule1".to_string(),
            ..Default::default()
        };
        let period_schedule2 = PeriodScheduleRow {
            id: "period_schedule2".to_string(),
            ..Default::default()
        };
        let period1 = PeriodRow {
            id: "period1".to_string(),
            period_schedule_id: period_schedule1.id.clone(),
            ..Default::default()
        };
        let period2 = PeriodRow {
            id: "period2".to_string(),
            period_schedule_id: period_schedule1.id.clone(),
            ..Default::default()
        };
        let period3 = PeriodRow {
            id: "period3".to_string(),
            period_schedule_id: period_schedule2.id.clone(),
            ..Default::default()
        };

        // Two program settings, for tag1 and tag2, with one order type
        let program_requisition_setting1 = ProgramRequisitionSettingsRow {
            id: "program_setting1".to_string(),
            program_id: program1.id.clone(),
            name_tag_id: name_tag1.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };
        let order_type1 = ProgramRequisitionOrderTypeRow {
            id: "order_type1".to_string(),
            name: "Order Type 1".to_string(),
            program_requisition_settings_id: program_requisition_setting1.id.clone(),
            max_order_per_period: 1,
            ..Default::default()
        };
        let program_requisition_setting2 = ProgramRequisitionSettingsRow {
            id: "program_setting2".to_string(),
            program_id: program2.id.clone(),
            name_tag_id: name_tag2.id.clone(),
            period_schedule_id: period_schedule2.id.clone(),
        };
        let order_type2 = ProgramRequisitionOrderTypeRow {
            id: "order_type2".to_string(),
            name: "Order Type 2".to_string(),
            program_requisition_settings_id: program_requisition_setting2.id.clone(),
            max_order_per_period: 1,
            ..Default::default()
        };

        // store b name tag + program settings
        let name_tag_join3 = NameTagJoinRow {
            id: "name_tag_join3".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_b().id,
        };
        let program_requisition_setting3 = ProgramRequisitionSettingsRow {
            id: "program_setting3".to_string(),
            program_id: program1.id.clone(),
            name_tag_id: name_tag1.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };
        // store c
        let name_tag_join4 = NameTagJoinRow {
            id: "name_tag_join4".to_string(),
            name_tag_id: name_tag2.id.clone(),
            name_link_id: mock_name_store_c().id,
        };
        let program_requisition_setting4 = ProgramRequisitionSettingsRow {
            id: "program_setting4".to_string(),
            program_id: program2.id.clone(),
            name_tag_id: name_tag2.id.clone(),
            period_schedule_id: period_schedule2.id.clone(),
        };

        // mock_name_store_b and mock_name_store_c to be joined
        // to program 1 and program 2 respectively and visible in mock_store_a
        let master_list_name_join3 = MasterListNameJoinRow {
            id: "master_list_name_join3".to_string(),
            name_link_id: mock_name_store_b().id,
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join4 = MasterListNameJoinRow {
            id: "master_list_name_join4".to_string(),
            name_link_id: mock_name_store_c().id,
            master_list_id: master_list2.id.clone(),
        };
        let name_store_join1 = NameStoreJoinRow {
            id: "name_store_join1".to_string(),
            name_link_id: mock_name_store_a().id.clone(),
            store_id: mock_store_a().id,
            name_is_customer: true,
            ..Default::default()
        };
        let name_store_join2: NameStoreJoinRow = NameStoreJoinRow {
            id: "name_store_join2".to_string(),
            name_link_id: mock_name_store_b().id.clone(),
            store_id: mock_store_b().id,
            name_is_customer: true,
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider, ..
        } = setup_all_with_data_and_service_provider(
            "get_customer_program_requisition_settings",
            MockDataInserts::none()
                .names()
                .stores()
                .numbers()
                .user_accounts()
                .user_store_joins(),
            MockData {
                periods: vec![period1.clone(), period2.clone(), period3.clone()],
                period_schedules: vec![period_schedule1, period_schedule2],
                name_tags: vec![name_tag1.clone(), name_tag2.clone()],
                name_tag_joins: vec![
                    name_tag_join1,
                    name_tag_join2,
                    name_tag_join3,
                    name_tag_join4,
                ],
                name_store_joins: vec![name_store_join1.clone(), name_store_join2.clone()],
                master_lists: vec![master_list1.clone(), master_list2.clone()],
                master_list_name_joins: vec![
                    master_list_name_join1,
                    master_list_name_join2,
                    master_list_name_join3,
                    master_list_name_join4,
                ],
                program_requisition_settings: vec![
                    program_requisition_setting1.clone(),
                    program_requisition_setting2.clone(),
                    program_requisition_setting3.clone(),
                    program_requisition_setting4.clone(),
                ],
                program_order_types: vec![order_type1.clone(), order_type2.clone()],
                contexts: vec![context1.clone(), context2.clone()],
                programs: vec![program1.clone(), program2.clone()],
                ..Default::default()
            },
        )
        .await;

        let service_context = service_provider
            .context(
                mock_store_a().id.to_string(),
                mock_user_account_a().id.clone(),
            )
            .unwrap();

        // Should be able to insert for store A period 2

        let result = service_provider
            .requisition_service
            .insert_program_response_requisition(
                &service_context,
                InsertProgramResponseRequisition {
                    id: "requisition3".to_string(),
                    other_party_id: mock_name_store_b().id.clone(),
                    program_order_type_id: order_type1.id.clone(),
                    period_id: period2.id.clone(),
                },
            );
        assert!(result.is_ok());

        // Should not be able to insert second time for store A period 2 (because now requisition already exists)
        let result = service_provider
            .requisition_service
            .insert_program_response_requisition(
                &service_context,
                InsertProgramResponseRequisition {
                    id: "requisition4".to_string(),
                    other_party_id: mock_name_store_b().id.clone(),
                    program_order_type_id: order_type1.id.clone(),
                    period_id: period2.id.clone(),
                },
            );
        assert!(result.is_err());
        assert!(
            result.unwrap_err() == InsertProgramResponseRequisitionError::MaxOrdersReachedForPeriod
        );
    }
}
