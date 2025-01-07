use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    requisition::{
        common::{check_requisition_row_exists, default_indicator_value},
        program_indicator::query::{program_indicators, ProgramIndicator},
        program_settings::get_customer_program_requisition_settings,
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

    let program_settings = get_customer_program_requisition_settings(ctx, &ctx.store_id)?;

    if !program_settings.iter().any(|setting| {
        setting
            .customer_and_order_types
            .iter()
            .any(|(customer, _)| customer.customer.name_row.id == input.other_party_id)
    }) {
        return Err(OutError::CustomerNotValid);
    }

    let (program_setting, order_type) = program_settings
        .iter()
        .find_map(|setting| {
            setting
                .customer_and_order_types
                .iter()
                .find(|(customer, order_types)| {
                    customer.customer.name_row.id == input.other_party_id
                        && order_types.iter().any(|order_type| {
                            order_type.order_type.id == input.program_order_type_id
                        })
                })
                .map(|(_, order_types)| {
                    (
                        setting,
                        order_types
                            .iter()
                            .find(|order_type| {
                                order_type.order_type.id == input.program_order_type_id
                            })
                            .unwrap(),
                    )
                })
        })
        .ok_or(OutError::ProgramOrderTypeDoesNotExist)?;

    if order_type.available_periods.is_empty() {
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

pub struct GenerateResult {
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
        // Default
        colour: None,
        comment: None,
        expected_delivery_date: None,
        their_reference: None,
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

    let requisition_lines = generate_lines(ctx, &ctx.store_id, &requisition, program_item_ids)?;

    let program_indicators = program_indicators(
        connection,
        Pagination::all(),
        None,
        Some(ProgramIndicatorFilter::new().program_id(EqualFilter::equal_to(&program.id))),
    )?;

    let customer_store = StoreRepository::new(connection)
        .query_one(StoreFilter::new().name_id(EqualFilter::equal_to(&other_party_id)))?;

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

    let result = items
        .into_iter()
        .map(|item| {
            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item.item_row.id.clone(),
                item_name: item.item_row.name.clone(),
                snapshot_datetime: Some(Utc::now().naive_utc()),
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
