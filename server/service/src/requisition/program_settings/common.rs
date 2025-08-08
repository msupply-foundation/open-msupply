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

pub(crate) fn get_program_ids(
    connection: &StorageConnection,
    settings: &Vec<ProgramRequisitionSettings>,
) -> Result<Vec<String>, RepositoryError> {
    let has_elmis_code = settings.iter().any(|s| s.program_row.elmis_code.is_some());

    let program_ids: Vec<String> = match has_elmis_code {
        true => {
            let elmis_codes: Vec<String> = settings
                .iter()
                .filter_map(|s| s.program_row.elmis_code.clone())
                .collect();
            ProgramRepository::new(connection)
                .query_by_filter(
                    ProgramFilter::new().elmis_code(EqualFilter::equal_any(elmis_codes)),
                )?
                .iter()
                .map(|p| p.id.clone())
                .collect()
        }
        false => settings.iter().map(|s| s.program_row.id.clone()).collect(),
    };

    Ok(program_ids)
}
