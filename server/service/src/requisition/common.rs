use std::collections::{HashMap, HashSet};

use repository::{
    requisition_row::RequisitionRow, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};
use repository::{
    ApprovalStatusType, EqualFilter, IndicatorColumnRow, IndicatorColumnRowRepository,
    IndicatorLineRow, IndicatorLineRowRepository, IndicatorValueType, MasterList, MasterListFilter,
    MasterListRepository, ProgramFilter, ProgramIndicatorFilter, ProgramIndicatorRepository,
    ProgramRepository, ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettingsFilter,
    ProgramRequisitionSettingsRepository, Requisition, RequisitionFilter, RequisitionRepository,
    RequisitionType,
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

/// Expand `program_indicator_ids` to include indicators from all programs
/// sharing the same `elmis_code`. Deployments can split a single
/// logical program across multiple programs per facility level (customer vs
/// district) sharing an `elmis_code`; indicators need to aggregate across
/// them. Input PIs whose program has no `elmis_code` are preserved as-is
/// (they can't be expanded, but we don't want to drop them).
pub(crate) fn related_program_indicator_ids(
    connection: &StorageConnection,
    program_indicator_ids: &[String],
) -> Result<Vec<String>, RepositoryError> {
    if program_indicator_ids.is_empty() {
        return Ok(vec![]);
    }

    let own_pis = ProgramIndicatorRepository::new(connection).query_by_filter(
        ProgramIndicatorFilter::new().id(EqualFilter::equal_any(program_indicator_ids.to_vec())),
    )?;
    let program_ids: Vec<String> = own_pis
        .iter()
        .map(|pi| pi.program_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    let programs = ProgramRepository::new(connection)
        .query_by_filter(ProgramFilter::new().id(EqualFilter::equal_any(program_ids)))?;

    let elmis_codes: Vec<String> = programs
        .iter()
        .filter_map(|p| p.elmis_code.clone().filter(|c| !c.is_empty()))
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    if elmis_codes.is_empty() {
        return Ok(program_indicator_ids.to_vec());
    }

    let programs_without_elmis: HashSet<String> = programs
        .iter()
        .filter(|p| p.elmis_code.as_deref().unwrap_or("").is_empty())
        .map(|p| p.id.clone())
        .collect();
    let preserved_input_pis: HashSet<String> = own_pis
        .iter()
        .filter(|pi| programs_without_elmis.contains(&pi.program_id))
        .map(|pi| pi.id.clone())
        .collect();

    let related_program_ids: Vec<String> = ProgramRepository::new(connection)
        .query_by_filter(ProgramFilter::new().elmis_code(EqualFilter::equal_any(elmis_codes)))?
        .into_iter()
        .map(|p| p.id)
        .collect();

    let mut related_pi_ids: HashSet<String> = ProgramIndicatorRepository::new(connection)
        .query_by_filter(
            ProgramIndicatorFilter::new().program_id(EqualFilter::equal_any(related_program_ids)),
        )?
        .into_iter()
        .map(|pi| pi.id)
        .collect();
    related_pi_ids.extend(preserved_input_pis);

    Ok(if related_pi_ids.is_empty() {
        program_indicator_ids.to_vec()
    } else {
        related_pi_ids.into_iter().collect()
    })
}

/// Lines and columns across all program indicators related (by `elmis_code`)
/// to the given starting program_indicator_ids, with mappings from any matched
/// row's `id` back to its identity key (`code` for lines, `(header, column_number)`
/// for columns). Used to match customer indicator values across programs.
pub(crate) struct RelatedIndicatorSchema {
    pub lines: Vec<IndicatorLineRow>,
    pub columns: Vec<IndicatorColumnRow>,
    pub line_id_to_code: HashMap<String, String>,
    pub column_id_to_key: HashMap<String, (String, i32)>,
}

pub(crate) fn related_indicator_schema(
    connection: &StorageConnection,
    program_indicator_ids: &[String],
) -> Result<RelatedIndicatorSchema, RepositoryError> {
    let expanded_pi_ids = related_program_indicator_ids(connection, program_indicator_ids)?;
    let lines =
        IndicatorLineRowRepository::new(connection).find_many_by_indicator_ids(&expanded_pi_ids)?;
    let columns = IndicatorColumnRowRepository::new(connection)
        .find_many_by_indicator_ids(&expanded_pi_ids)?;

    let line_id_to_code = lines
        .iter()
        .map(|l| (l.id.clone(), l.code.clone()))
        .collect();
    let column_id_to_key = columns
        .iter()
        .map(|c| (c.id.clone(), (c.header.clone(), c.column_number)))
        .collect();

    Ok(RelatedIndicatorSchema {
        lines,
        columns,
        line_id_to_code,
        column_id_to_key,
    })
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

pub(crate) fn get_indicative_price_pref(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    ShowIndicativePriceInRequisitions {}
        .load(connection, Some(store_id.to_string()))
        .map_err(|e| RepositoryError::DBError {
            msg: "Could not load showIndicativePriceInRequisitions store preference".to_string(),
            extra: e.to_string(),
        })
}

#[cfg(test)]
mod test_related_program_indicators {
    use super::*;
    use repository::{
        mock::{context_program_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        IndicatorColumnRow, IndicatorLineRow, ProgramIndicatorRow, ProgramRow,
    };

    // Two programs that share an elmis_code (e.g. CS + DISTRICT facility levels
    // of the same logical program), each with its own program_indicator.
    fn program_cs() -> ProgramRow {
        ProgramRow {
            id: "elmis_program_cs".to_string(),
            master_list_id: None,
            name: "elmis_program_cs".to_string(),
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: Some("SHARED_ELMIS".to_string()),
            deleted_datetime: None,
        }
    }
    fn program_district() -> ProgramRow {
        ProgramRow {
            id: "elmis_program_district".to_string(),
            master_list_id: None,
            name: "elmis_program_district".to_string(),
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: Some("SHARED_ELMIS".to_string()),
            deleted_datetime: None,
        }
    }
    fn program_unrelated() -> ProgramRow {
        ProgramRow {
            id: "elmis_program_unrelated".to_string(),
            master_list_id: None,
            name: "elmis_program_unrelated".to_string(),
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: Some("OTHER_ELMIS".to_string()),
            deleted_datetime: None,
        }
    }
    fn pi_cs() -> ProgramIndicatorRow {
        ProgramIndicatorRow {
            id: "pi_cs".to_string(),
            program_id: program_cs().id,
            code: Some("pi_cs".to_string()),
            is_active: true,
        }
    }
    fn pi_district() -> ProgramIndicatorRow {
        ProgramIndicatorRow {
            id: "pi_district".to_string(),
            program_id: program_district().id,
            code: Some("pi_district".to_string()),
            is_active: true,
        }
    }
    fn pi_unrelated() -> ProgramIndicatorRow {
        ProgramIndicatorRow {
            id: "pi_unrelated".to_string(),
            program_id: program_unrelated().id,
            code: Some("pi_unrelated".to_string()),
            is_active: true,
        }
    }
    fn line_cs() -> IndicatorLineRow {
        IndicatorLineRow {
            id: "line_cs".to_string(),
            code: "SHARED_CODE".to_string(),
            program_indicator_id: pi_cs().id,
            line_number: 0,
            description: "CS line".to_string(),
            value_type: Some(repository::IndicatorValueType::Number),
            default_value: "0".to_string(),
            is_required: false,
            is_active: true,
        }
    }
    fn line_district() -> IndicatorLineRow {
        IndicatorLineRow {
            id: "line_district".to_string(),
            code: "SHARED_CODE".to_string(),
            program_indicator_id: pi_district().id,
            line_number: 0,
            description: "District line".to_string(),
            value_type: Some(repository::IndicatorValueType::Number),
            default_value: "0".to_string(),
            is_required: false,
            is_active: true,
        }
    }
    fn col_cs() -> IndicatorColumnRow {
        IndicatorColumnRow {
            id: "col_cs".to_string(),
            program_indicator_id: pi_cs().id,
            column_number: 0,
            header: "SHARED_HEADER".to_string(),
            value_type: Some(repository::IndicatorValueType::Number),
            default_value: "0".to_string(),
            is_active: true,
        }
    }
    fn col_district() -> IndicatorColumnRow {
        IndicatorColumnRow {
            id: "col_district".to_string(),
            program_indicator_id: pi_district().id,
            column_number: 0,
            header: "SHARED_HEADER".to_string(),
            value_type: Some(repository::IndicatorValueType::Number),
            default_value: "0".to_string(),
            is_active: true,
        }
    }

    fn test_mock_data() -> MockData {
        MockData {
            programs: vec![program_cs(), program_district(), program_unrelated()],
            program_indicators: vec![pi_cs(), pi_district(), pi_unrelated()],
            indicator_lines: vec![line_cs(), line_district()],
            indicator_columns: vec![col_cs(), col_district()],
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn related_program_indicator_ids_empty_input() {
        let (_, connection, _, _) = setup_all_with_data(
            "related_program_indicator_ids_empty_input",
            MockDataInserts::none().contexts().programs(),
            test_mock_data(),
        )
        .await;

        let result = related_program_indicator_ids(&connection, &[]).unwrap();
        assert!(result.is_empty());
    }

    #[actix_rt::test]
    async fn related_program_indicator_ids_expands_via_elmis_code() {
        let (_, connection, _, _) = setup_all_with_data(
            "related_program_indicator_ids_expands_via_elmis_code",
            MockDataInserts::none().contexts().programs(),
            test_mock_data(),
        )
        .await;

        let mut result =
            related_program_indicator_ids(&connection, &[pi_cs().id]).unwrap();
        result.sort();
        assert_eq!(result, vec![pi_cs().id, pi_district().id]);

        // Unrelated PI (different elmis_code) is not pulled in.
        assert!(!result.contains(&pi_unrelated().id));
    }

    #[actix_rt::test]
    async fn related_program_indicator_ids_mixed_preserves_non_elmis_input() {
        // Input mixes a PI whose program has an elmis_code with one whose
        // program doesn't. The non-elmis input must be preserved alongside
        // the elmis_code expansion, not silently dropped.
        let bare_program = ProgramRow {
            id: "bare_program".to_string(),
            master_list_id: None,
            name: "bare_program".to_string(),
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: None,
            deleted_datetime: None,
        };
        let bare_pi = ProgramIndicatorRow {
            id: "bare_pi".to_string(),
            program_id: bare_program.id.clone(),
            code: None,
            is_active: true,
        };

        let (_, connection, _, _) = setup_all_with_data(
            "related_program_indicator_ids_mixed_preserves_non_elmis_input",
            MockDataInserts::none().contexts().programs(),
            MockData {
                programs: vec![program_cs(), program_district(), bare_program],
                program_indicators: vec![pi_cs(), pi_district(), bare_pi.clone()],
                indicator_lines: vec![line_cs(), line_district()],
                indicator_columns: vec![col_cs(), col_district()],
                ..Default::default()
            },
        )
        .await;

        let mut result =
            related_program_indicator_ids(&connection, &[pi_cs().id, bare_pi.id.clone()]).unwrap();
        result.sort();
        assert_eq!(result, vec![bare_pi.id, pi_cs().id, pi_district().id]);
    }

    #[actix_rt::test]
    async fn related_program_indicator_ids_no_elmis_code_fallback() {
        // Program with no elmis_code should fall back to returning the input ids.
        let bare_program = ProgramRow {
            id: "bare_program".to_string(),
            master_list_id: None,
            name: "bare_program".to_string(),
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: None,
            deleted_datetime: None,
        };
        let bare_pi = ProgramIndicatorRow {
            id: "bare_pi".to_string(),
            program_id: bare_program.id.clone(),
            code: None,
            is_active: true,
        };

        let (_, connection, _, _) = setup_all_with_data(
            "related_program_indicator_ids_no_elmis_code_fallback",
            MockDataInserts::none().contexts().programs(),
            MockData {
                programs: vec![bare_program],
                program_indicators: vec![bare_pi.clone()],
                ..Default::default()
            },
        )
        .await;

        let result =
            related_program_indicator_ids(&connection, &[bare_pi.id.clone()]).unwrap();
        assert_eq!(result, vec![bare_pi.id]);
    }

    #[actix_rt::test]
    async fn related_indicator_schema_returns_cross_program_rows_and_mappings() {
        let (_, connection, _, _) = setup_all_with_data(
            "related_indicator_schema_returns_cross_program",
            MockDataInserts::none().contexts().programs(),
            test_mock_data(),
        )
        .await;

        let schema = related_indicator_schema(&connection, &[pi_cs().id]).unwrap();

        // Lines from both CS and DISTRICT PIs.
        let mut line_ids: Vec<String> = schema.lines.iter().map(|l| l.id.clone()).collect();
        line_ids.sort();
        assert_eq!(line_ids, vec![line_cs().id, line_district().id]);

        // Columns from both PIs.
        let mut col_ids: Vec<String> = schema.columns.iter().map(|c| c.id.clone()).collect();
        col_ids.sort();
        assert_eq!(col_ids, vec![col_cs().id, col_district().id]);

        // line_id → code mapping covers both programs; both share the same code.
        assert_eq!(
            schema.line_id_to_code.get(&line_cs().id),
            Some(&"SHARED_CODE".to_string())
        );
        assert_eq!(
            schema.line_id_to_code.get(&line_district().id),
            Some(&"SHARED_CODE".to_string())
        );

        // column_id → (header, column_number) mapping covers both programs.
        assert_eq!(
            schema.column_id_to_key.get(&col_cs().id),
            Some(&("SHARED_HEADER".to_string(), 0))
        );
        assert_eq!(
            schema.column_id_to_key.get(&col_district().id),
            Some(&("SHARED_HEADER".to_string(), 0))
        );
    }
}
