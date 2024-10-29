use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    requisition::{
        common::check_requisition_row_exists,
        program_settings::get_customer_program_requisition_settings, query::get_requisition,
        request_requisition::generate_requisition_lines,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, EqualFilter, MasterListLineFilter, MasterListLineRepository, NumberRowType,
    ProgramRequisitionOrderTypeRow, ProgramRow, RepositoryError, Requisition, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRowRepository,
};

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
            let (new_requisition, requisition_lines) = generate(ctx, program, order_type, input)?;
            RequisitionRowRepository::new(connection).upsert_one(&new_requisition)?;

            let requisition_line_repo = RequisitionLineRowRepository::new(connection);
            for requisition_line in requisition_lines {
                requisition_line_repo.upsert_one(&requisition_line)?;
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
) -> Result<(RequisitionRow, Vec<RequisitionLineRow>), RepositoryError> {
    let connection = &ctx.connection;

    let requisition = RequisitionRow {
        id,
        user_id: Some(ctx.user_id.clone()),
        requisition_number: next_number(
            &ctx.connection,
            &NumberRowType::ResponseRequisition,
            &ctx.store_id,
        )?,
        name_link_id: other_party_id,
        store_id: ctx.store_id.clone(),
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: Utc::now().naive_utc(),
        max_months_of_stock: order_type.max_mos,
        min_months_of_stock: order_type.threshold_mos,
        program_id: Some(program.id),
        period_id: Some(period_id),
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

    let requisition_line_rows =
        generate_requisition_lines(ctx, &ctx.store_id, &requisition, program_item_ids)?;

    Ok((requisition, requisition_line_rows))
}

impl From<RepositoryError> for InsertProgramResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertProgramResponseRequisitionError::DatabaseError(error)
    }
}
