use repository::{
    EqualFilter, PeriodRow, ProgramFilter, ProgramRepository, ProgramRequisitionOrderTypeRow,
    ProgramRequisitionSettings, RepositoryError, RequisitionsInPeriod, StorageConnection,
};
use util::date_now;

// History = historic and current
const MAX_NUMBER_OF_HISTORIC_PERIODS: usize = 5;
const MAX_NUMBER_OF_FUTURE_PERIODS: usize = 5;

/// Deduce if period is available for order_type based on
/// matching period_schedule_id and number of requisition that exists for this
/// order_type and program_id is within order_type.max_order_per_period
/// note: lowercase match for order type
pub fn period_is_available(
    period: &PeriodRow,
    setting: &ProgramRequisitionSettings,
    order_type: &ProgramRequisitionOrderTypeRow,
    requisitions_in_periods: &Vec<RequisitionsInPeriod>,
) -> bool {
    if period.period_schedule_id != setting.program_settings_row.period_schedule_id {
        return false;
    }

    // requisitions_in_period already has a count of how many requisitions are in a period
    // there should only be one requisitions_in_period entry for one program period, see
    // requisitions_in_period view
    let this_period_requisitions = requisitions_in_periods
        .iter()
        .find(|requisition_in_period| {
            requisition_in_period.program_id == setting.program_row.id
                && requisition_in_period.period_id == period.id
                // Case insensitive match for order_type
                && requisition_in_period.order_type.to_lowercase() == order_type.name.to_lowercase()
        });

    let number_of_requisitions_in_this_period =
        this_period_requisitions.map(|r| r.count).unwrap_or(0);

    number_of_requisitions_in_this_period < order_type.max_order_per_period as i64
}

/// Reduce periods by MAX_NUMBER_OF_HISTORIC_PERIODS and MAX_NUMBER_OF_FUTURE_PERIODS
/// and sort in ascending order
pub fn reduce_and_sort_periods(periods: Vec<PeriodRow>) -> Vec<PeriodRow> {
    let now = date_now();
    // History = historic and current, thus p.start_date < now
    let (mut historic, mut future): (Vec<PeriodRow>, Vec<PeriodRow>) =
        periods.into_iter().partition(|p| p.start_date < now);
    // Sort them

    future.sort_by(|a, b| a.start_date.cmp(&b.start_date));
    historic.sort_by(|a, b| a.start_date.cmp(&b.start_date));

    // Take first MAX_NUMBER_OF_FUTURE_PERIODS (sorted in ASC order)

    let future_iter = future.into_iter().take(MAX_NUMBER_OF_FUTURE_PERIODS);

    // Take last MAX_NUMBER_OF_HISTORIC_PERIODS (sorted in ASC order)
    // there is not 'take' method for last X elements
    historic
        .into_iter()
        // Reverse once to get last X
        .rev()
        .take(MAX_NUMBER_OF_HISTORIC_PERIODS)
        // Reverse second time to retain order
        .rev()
        // Add future periods
        .chain(future_iter)
        .collect()
}

/// Program ids for the given settings, expanded to include every program sharing
/// an `elmis_code` with one of them. Programs without an `elmis_code` are always
/// kept, so a store mixing coded and uncoded programs still finds suppliers for
/// the uncoded ones.
pub(crate) fn get_program_ids(
    connection: &StorageConnection,
    settings: &Vec<ProgramRequisitionSettings>,
) -> Result<Vec<String>, RepositoryError> {
    let mut program_ids: Vec<String> = settings.iter().map(|s| s.program_row.id.clone()).collect();

    let elmis_codes: Vec<String> = settings
        .iter()
        .filter_map(|s| s.program_row.elmis_code.clone())
        .filter(|c| !c.is_empty())
        .collect();

    if !elmis_codes.is_empty() {
        let related = ProgramRepository::new(connection).query_by_filter(
            ProgramFilter::new().elmis_code(EqualFilter::equal_any(elmis_codes)),
        )?;
        program_ids.extend(related.into_iter().map(|p| p.id));
    }

    program_ids.sort();
    program_ids.dedup();

    Ok(program_ids)
}

#[cfg(test)]
mod test {
    use super::get_program_ids;
    use repository::{
        mock::{context_program_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        MasterListRow, NameTagRow, ProgramRequisitionSettings, ProgramRequisitionSettingsRow,
        ProgramRow,
    };

    fn program(id: &str, elmis_code: Option<&str>) -> ProgramRow {
        ProgramRow {
            id: id.to_string(),
            name: id.to_string(),
            master_list_id: None,
            context_id: context_program_a().id,
            is_immunisation: false,
            elmis_code: elmis_code.map(str::to_string),
            deleted_datetime: None,
        }
    }

    fn setting(program_row: ProgramRow) -> ProgramRequisitionSettings {
        ProgramRequisitionSettings {
            program_settings_row: ProgramRequisitionSettingsRow::default(),
            program_row,
            master_list: MasterListRow::default(),
            name_tag_row: NameTagRow::default(),
        }
    }

    #[actix_rt::test]
    async fn get_program_ids_keeps_uncoded_programs_when_others_have_elmis_code() {
        let coded = program("coded", Some("SHARED"));
        let coded_related = program("coded_related", Some("SHARED"));
        let uncoded = program("uncoded", None);
        let unrelated = program("unrelated", Some("OTHER"));

        let (_, connection, _, _) = setup_all_with_data(
            "get_program_ids_keeps_uncoded_programs_when_others_have_elmis_code",
            MockDataInserts::none().contexts(),
            MockData {
                programs: vec![
                    coded.clone(),
                    coded_related.clone(),
                    uncoded.clone(),
                    unrelated,
                ],
                ..Default::default()
            },
        )
        .await;

        let result = get_program_ids(&connection, &vec![setting(coded), setting(uncoded)]).unwrap();

        assert_eq!(
            result,
            vec![
                "coded".to_string(),
                "coded_related".to_string(),
                "uncoded".to_string()
            ]
        );
    }

    #[actix_rt::test]
    async fn get_program_ids_no_elmis_code() {
        let a = program("a", None);
        let b = program("b", None);

        let (_, connection, _, _) = setup_all_with_data(
            "get_program_ids_no_elmis_code",
            MockDataInserts::none().contexts(),
            MockData {
                programs: vec![a.clone(), b.clone()],
                ..Default::default()
            },
        )
        .await;

        let result = get_program_ids(&connection, &vec![setting(a), setting(b)]).unwrap();

        assert_eq!(result, vec!["a".to_string(), "b".to_string()]);
    }
}
