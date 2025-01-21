use crate::requisition::program_settings::common::{period_is_available, reduce_and_sort_periods};

use super::{prepare::PrepareProgramSettings, CustomerProgramSettings, OrderType};

/// Map program_settings, order_types, periods and requisitions_in_period to ProgramSettings
/// based on the customer.
pub(super) fn map_customer_program_settings(
    PrepareProgramSettings {
        settings,
        order_types,
        periods,
        program_customer_and_requisitions_in_periods,
    }: PrepareProgramSettings,
) -> Vec<CustomerProgramSettings> {
    settings
        .into_iter()
        .map(|program_setting| {
            let customer_and_order_types = program_customer_and_requisitions_in_periods
                .iter()
                .filter(|(customer, _)| {
                    customer.program.id == program_setting.program_row.id
                        || (customer.program.elmis_code == program_setting.program_row.elmis_code
                            && customer.program.elmis_code.is_some())
                })
                .map(|(customer, requisitions_in_periods)| {
                    // Filter available periods for program settings for the customer
                    let order_types = order_types
                        .iter()
                        .filter(|p| {
                            p.program_requisition_settings_id
                                == program_setting.program_settings_row.id
                        })
                        .map(|order_type| {
                            let available_periods = periods
                                .iter()
                                .filter(|period| {
                                    period_is_available(
                                        period,
                                        &program_setting,
                                        order_type,
                                        requisitions_in_periods,
                                    )
                                })
                                .cloned()
                                .collect();

                            // Order type for program settings
                            OrderType {
                                available_periods: reduce_and_sort_periods(available_periods),
                                order_type: order_type.clone(),
                            }
                        })
                        .collect();

                    (customer.clone(), order_types)
                })
                .collect();

            CustomerProgramSettings {
                customer_and_order_types,
                program_requisition_settings: program_setting,
            }
        })
        .collect()
}

#[test]
fn test_reduce_and_sort_periods() {
    use repository::PeriodRow;

    fn make_date(offset: &i32) -> PeriodRow {
        PeriodRow {
            id: offset.to_string(),
            start_date: util::date_now_with_offset(chrono::Duration::days(*offset as i64)),
            ..PeriodRow::default()
        }
    }

    let periods: Vec<PeriodRow> = [3, -10, -2, -5, 10, 11, 2, 4, -4, -10, 20, 21]
        .iter()
        .map(make_date)
        .collect();

    let result: Vec<PeriodRow> = [-4, -2, 2, 3].iter().map(make_date).collect();

    assert_eq!(reduce_and_sort_periods(periods), result)
}
