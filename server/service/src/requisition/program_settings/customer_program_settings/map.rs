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
            let customer_and_order_type = program_customer_and_requisitions_in_periods
                .iter()
                .filter(|(customer, _)| customer.program.id == program_setting.program_row.id)
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
                customer_and_order_type,
                program_requisition_settings: program_setting,
            }
        })
        .collect()
}
