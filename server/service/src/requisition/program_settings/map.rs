use repository::{
    PeriodRow, ProgramRequisitionOrderTypeRow, ProgramRequisitionSettings, RequisitionsInPeriod,
};

use super::{prepare::PrepareProgramSettings, OrderType, ProgramSettings};

/// Map prepared program_settings, order_types, periods and requisitions_in_periods to ProgramSettings
/// order types are mapped to program settings by program setting id
/// available periods are mapped with period_is_available, see description
/// supplier are mapped by program_id
pub(super) fn map(
    PrepareProgramSettings {
        settings,
        order_types,
        periods,
        program_suppliers,
        requisitions_in_period,
    }: PrepareProgramSettings,
) -> Vec<ProgramSettings> {
    settings
        .into_iter()
        .map(|program_setting| {
            // Filter and map (to include available_periods) order type for program setting
            let order_types = order_types
                .iter()
                .filter(|o| {
                    o.program_requisition_settings_id == program_setting.program_settings_row.id
                })
                .map(|order_type| {
                    // Filter periods for order type, period_is_available
                    let available_periods = periods
                        .iter()
                        .filter(|period| {
                            period_is_available(
                                period,
                                &program_setting,
                                &order_type,
                                &requisitions_in_period,
                            )
                        })
                        .map(|p| p.clone())
                        .collect();

                    // Order type for program settings
                    OrderType {
                        available_periods,
                        order_type: order_type.clone(),
                    }
                })
                .collect();

            // Filter by program_id
            let suppliers = program_suppliers
                .iter()
                .filter(|s| s.program.id == program_setting.program_row.id)
                .map(|s| s.clone())
                .collect();

            ProgramSettings {
                order_types,
                suppliers,
                program_requisition_settings: program_setting,
            }
        })
        .collect()
}

/// Deduce if period is available for order_type based on
/// matching period_schedule_id and number of requisition that exists for this
/// order_type and program_id is within order_type.max_order_per_period
/// note: lowercase match for order type
fn period_is_available(
    period: &PeriodRow,
    setting: &ProgramRequisitionSettings,
    order_type: &ProgramRequisitionOrderTypeRow,
    requisitions_in_period: &Vec<RequisitionsInPeriod>,
) -> bool {
    if period.period_schedule_id != setting.program_settings_row.period_schedule_id {
        return false;
    }

    match requisitions_in_period.iter().find(|requisition_in_period| {
        requisition_in_period.program_id == setting.program_row.id
        && requisition_in_period.period_id == period.id
        // Case insensitive match for order_type
            && requisition_in_period.order_type.to_lowercase() == order_type.name.to_lowercase()
    }) {
        Some(requisitions_in_period) => {
            requisitions_in_period.count < order_type.max_order_per_period as i64
        }
        None => true,
    }
}
