use repository::{
    requisition_row::RequisitionRow, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};
use repository::{
    ApprovalStatusType, EqualFilter, IndicatorValueRow, ProgramFilter,
    ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettingsFilter,
    ProgramRequisitionSettingsRepository, Requisition, RequisitionFilter, RequisitionRepository,
};
use util::inline_edit;
use util::uuid::uuid;

use super::program_indicator::query::ProgramIndicator;

pub fn check_requisition_row_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<RequisitionRow>, RepositoryError> {
    RequisitionRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_requisition_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<Requisition>, RepositoryError> {
    Ok(RequisitionRepository::new(connection)
        .query_by_filter(RequisitionFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}

pub fn get_lines_for_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<RequisitionLine>, RepositoryError> {
    RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_id)),
    )
}

pub fn generate_requisition_user_id_update(
    user_id: &str,
    existing_requisition_row: RequisitionRow,
) -> Option<RequisitionRow> {
    let user_id_option = Some(user_id.to_string());
    let user_id_has_changed = existing_requisition_row.user_id != user_id_option;
    user_id_has_changed.then(|| {
        inline_edit(&existing_requisition_row, |mut u| {
            u.user_id = user_id_option;
            u
        })
    })
}

pub fn check_approval_status(requisition_row: &RequisitionRow) -> bool {
    // TODO Rework once plugins are implemented
    if let Some(approval_status) = &requisition_row.approval_status {
        return requisition_row.program_id.is_some()
            && (*approval_status == ApprovalStatusType::Pending
                || *approval_status == ApprovalStatusType::Denied
                || *approval_status == ApprovalStatusType::DeniedByAnother);
    }
    false
}

pub enum OrderTypeNotFoundError {
    OrderTypeNotFound,
    DatabaseError(RepositoryError),
}

pub fn check_emergency_order_within_max_items_limit(
    connection: &StorageConnection,
    program_id: &str,
    order_type: &str,
    requisition_lines: Vec<RequisitionLine>,
) -> Result<(bool, i32), OrderTypeNotFoundError> {
    let program_settings_ids = ProgramRequisitionSettingsRepository::new(connection)
        .query(Some(ProgramRequisitionSettingsFilter::new().program(
            ProgramFilter::new().id(EqualFilter::equal_to(program_id)),
        )))?
        .iter()
        .map(|settings| settings.program_settings_row.id.clone())
        .collect::<Vec<String>>();

    let order_type = ProgramRequisitionOrderTypeRowRepository::new(connection)
        .find_one_by_setting_and_name(&program_settings_ids, order_type)?
        .ok_or(OrderTypeNotFoundError::OrderTypeNotFound)?;

    if !order_type.is_emergency {
        return Ok((true, 0));
    }

    let line_count = requisition_lines
        .iter()
        .filter(|line| line.requisition_line_row.requested_quantity != 0.0)
        .count();

    Ok((
        line_count <= order_type.max_items_in_emergency_order as usize,
        order_type.max_items_in_emergency_order,
    ))
}

impl From<RepositoryError> for OrderTypeNotFoundError {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}

pub struct IndicatorGenerationInput<'a> {
    pub store_id: &'a str,
    pub period_id: &'a str,
    pub program_indicators: Vec<ProgramIndicator>,
    pub other_party_id: &'a str,
}

pub fn generate_program_indicator_values(
    input: IndicatorGenerationInput,
) -> Vec<IndicatorValueRow> {
    let mut indicator_values = vec![];

    for program_indicator in input.program_indicators {
        for line in program_indicator.lines {
            for column in line.columns {
                let value = match column.value_type {
                    Some(_) => column.default_value.clone(),
                    None => line.line.default_value.clone(),
                };

                let indicator_value = IndicatorValueRow {
                    id: uuid(),
                    customer_name_link_id: input.other_party_id.to_string(),
                    store_id: input.store_id.to_string(),
                    period_id: input.period_id.to_string(),
                    indicator_line_id: line.line.id.to_string(),
                    indicator_column_id: column.id.to_string(),
                    value,
                };

                indicator_values.push(indicator_value);
            }
        }
    }

    indicator_values
}
