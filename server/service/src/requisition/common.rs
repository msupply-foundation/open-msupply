use std::collections::HashMap;

use repository::{
    requisition_row::RequisitionRow, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};
use repository::{
    ApprovalStatusType, EqualFilter, IndicatorColumnRow, IndicatorLineRow, IndicatorValueType,
    MasterList, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, ProgramFilter, ProgramRequisitionOrderTypeRowRepository,
    ProgramRequisitionSettingsFilter, ProgramRequisitionSettingsRepository, Requisition,
    RequisitionFilter, RequisitionRepository, RequisitionType,
};

use crate::preference::{Preference, ShowIndicativePriceInRequisitions};

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
        .query_by_filter(RequisitionFilter::new().id(EqualFilter::equal_to(id.to_string())))?
        .pop())
}

pub fn get_lines_for_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<RequisitionLine>, RepositoryError> {
    RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
    )
}

pub fn generate_requisition_user_id_update(
    user_id: &str,
    existing_requisition_row: RequisitionRow,
) -> Option<RequisitionRow> {
    let user_id_option = Some(user_id.to_string());
    let user_id_has_changed = existing_requisition_row.user_id != user_id_option;
    user_id_has_changed.then_some(RequisitionRow {
        user_id: user_id_option,
        ..existing_requisition_row
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
            ProgramFilter::new().id(EqualFilter::equal_to(program_id.to_string())),
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

#[derive(Debug)]
pub struct CheckExceededOrdersForPeriod<'a> {
    pub program_id: &'a str,
    pub period_id: &'a str,
    pub program_order_type_id: &'a str,
    pub max_orders_per_period: i64,
    pub requisition_type: RequisitionType,
    pub other_party_id: Option<&'a str>,
    pub store_id: &'a str,
}

pub fn check_exceeded_max_orders_for_period(
    connection: &StorageConnection,
    input: CheckExceededOrdersForPeriod,
) -> Result<bool, RepositoryError> {
    let order_type = ProgramRequisitionOrderTypeRowRepository::new(connection)
        .find_one_by_id(input.program_order_type_id)?;

    // TODO add check which matches lower case as per in period_is_available function
    match order_type {
        Some(order_type) => {
            let mut filter = RequisitionFilter::new()
                .program_id(EqualFilter::equal_to(input.program_id.to_string()))
                .order_type(EqualFilter::equal_to(order_type.name.to_owned()))
                .period_id(EqualFilter::equal_to(input.period_id.to_string()))
                .store_id(EqualFilter::equal_to(input.store_id.to_string()))
                .r#type(input.requisition_type.equal_to());

            if let Some(other_party_id) = input.other_party_id {
                filter = filter.name_id(EqualFilter::equal_to(other_party_id.to_string()));
            };

            let current_orders = RequisitionRepository::new(connection).count(Some(filter))?;

            Ok(current_orders >= input.max_orders_per_period)
        }
        None => Err(RepositoryError::NotFound),
    }
}

pub(crate) fn indicator_value_type<'a>(
    line: &'a IndicatorLineRow,
    column: &'a IndicatorColumnRow,
) -> &'a Option<IndicatorValueType> {
    if column.value_type.is_none() {
        &line.value_type
    } else {
        &column.value_type
    }
}

pub(crate) fn default_indicator_value(
    line: &IndicatorLineRow,
    column: &IndicatorColumnRow,
) -> String {
    match column.value_type {
        Some(_) => column.default_value.clone(),
        None => line.default_value.clone(),
    }
}

impl From<RepositoryError> for OrderTypeNotFoundError {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}

pub fn check_master_list_for_store(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id.to_string()))
            .exists_for_store_id(EqualFilter::equal_to(store_id.to_string()))
            .is_program(false),
    )?;
    Ok(rows.pop())
}

type PriceMap = HashMap<String, Option<f64>>;

pub(crate) fn get_indicative_price_pref(
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    ShowIndicativePriceInRequisitions {}
        .load(connection, None)
        .map_err(|e| RepositoryError::DBError {
            msg: "Could not load showIndicativePriceInRequisitions global preference".to_string(),
            extra: e.to_string(),
        })
}

pub(crate) fn get_default_price_map(
    connection: &StorageConnection,
) -> Result<PriceMap, RepositoryError> {
    let default_price_list = MasterListRepository::new(connection)
        .query_by_filter(MasterListFilter::new().is_default_price_list(true))?
        .pop();

    if let Some(price_list) = default_price_list {
        return Ok(MasterListLineRepository::new(connection)
            .query_by_filter(
                MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(price_list.id)),
                None,
            )?
            .into_iter()
            .map(|l| (l.item_id, l.price_per_unit))
            .collect());
    } else {
        return Ok(HashMap::new());
    }
}

pub(crate) fn get_indicative_price_pref_and_price_map(
    connection: &StorageConnection,
) -> Result<(bool, PriceMap), RepositoryError> {
    let should_show_indicative_price = get_indicative_price_pref(connection)?;

    let price_map = if should_show_indicative_price {
        get_default_price_map(connection)?
    } else {
        HashMap::new()
    };

    Ok((should_show_indicative_price, price_map))
}

pub(crate) fn get_item_price_per_unit(
    connection: &StorageConnection,
    item_id: &str,
    default_price_list_id: &str,
) -> Result<Option<f64>, RepositoryError> {
    Ok(MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(default_price_list_id.to_string()))
                .item_id(EqualFilter::equal_to(item_id.to_string())),
            None,
        )?
        .first()
        .and_then(|l| l.price_per_unit))
}

pub(crate) fn get_default_price_list(
    connection: &StorageConnection,
) -> Result<Option<repository::MasterListRow>, RepositoryError> {
    let default_price_list = MasterListRepository::new(connection)
        .query_by_filter(MasterListFilter::new().is_default_price_list(true))?
        .pop();
    Ok(default_price_list)
}
