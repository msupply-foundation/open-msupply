#[test]
fn test_reduce_and_sort_periods() {
    use crate::requisition::program_settings::common::reduce_and_sort_periods;

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
