use crate::requisition::program_settings::common::{period_is_available, reduce_and_sort_periods};
use repository::ProgramSupplier;

use super::{prepare::PrepareProgramSettings, OrderType, SupplierProgramSettings};

/// Map prepared program_settings, order_types, periods and requisitions_in_periods to ProgramSettings
/// order types are mapped to program settings by program setting id
/// available periods are mapped with period_is_available, see description
/// supplier are mapped by program_id
pub(super) fn map_supplier_program_settings(
    PrepareProgramSettings {
        settings,
        order_types,
        periods,
        program_suppliers,
        requisitions_in_periods,
    }: PrepareProgramSettings,
) -> Vec<SupplierProgramSettings> {
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
                                order_type,
                                &requisitions_in_periods,
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

            // Filter by program_id
            let mut suppliers: Vec<ProgramSupplier> = program_suppliers
                .iter()
                .filter(|s| {
                    s.program.id == program_setting.program_row.id
                        || (s.program.elmis_code == program_setting.program_row.elmis_code
                            && s.program.elmis_code.is_some())
                })
                .cloned()
                .collect();

            // A supplier can be matched multiple times as they can be found by program id or by elmis code.
            // this is to allow ordering from suppliers who don't have the same program assigned to their store
            // but do have an equivalent program with the same elmis_code
            // Note: for some reason we seem to have situations where supplier can match the same elmis code multiple times?

            // So... we dedup by supplier id so we don't get duplicates in the app
            suppliers.sort_by(|a, b| a.supplier.name_row.id.cmp(&b.supplier.name_row.id));
            suppliers.dedup_by(|a, b| a.supplier.name_row.id == b.supplier.name_row.id);

            SupplierProgramSettings {
                order_types,
                suppliers,
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

    let result: Vec<PeriodRow> = [-10, -10, -5, -4, -2, 2, 3, 4, 10, 11]
        .iter()
        .map(make_date)
        .collect();

    assert_eq!(reduce_and_sort_periods(periods), result)
}
