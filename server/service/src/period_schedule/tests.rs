#[cfg(test)]
mod query {
    use chrono::NaiveDate;
    use repository::mock::{
        mock_period, mock_period_2_a, mock_period_2_d, mock_period_schedule_1,
        mock_period_schedule_2, MockData, MockDataInserts,
    };
    use repository::test_db::setup_all_with_data;
    use repository::{PeriodRow, PeriodScheduleRow};

    use repository::{DateFilter, PeriodFilter};

    use crate::period_schedule::get_period_schedules;
    use crate::service_provider::ServiceProvider;

    fn empty_schedule() -> PeriodScheduleRow {
        PeriodScheduleRow {
            id: "empty_schedule".to_string(),
            name: "Empty".to_string(),
        }
    }

    fn future_period() -> PeriodRow {
        PeriodRow {
            id: "future_period".to_string(),
            name: "May 2099".to_string(),
            period_schedule_id: mock_period_schedule_2().id,
            start_date: NaiveDate::from_ymd_opt(2099, 5, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2099, 5, 31).unwrap(),
        }
    }

    #[actix_rt::test]
    async fn get_period_schedules_all_periods() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_period_schedules_all_periods",
            MockDataInserts::none().periods(),
            MockData {
                period_schedules: vec![empty_schedule()],
                periods: vec![future_period()],
                ..MockData::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let result = get_period_schedules(&context, "store_a", None).unwrap();

        // Every schedule, sorted by name: Empty, Monthly, Weekly
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].schedule_row.id, empty_schedule().id);
        assert_eq!(result[1].schedule_row.id, mock_period_schedule_1().id);
        assert_eq!(result[2].schedule_row.id, mock_period_schedule_2().id);

        // A schedule with no periods is still returned
        assert!(result[0].periods.is_empty());

        // Periods grouped under their own schedule
        assert_eq!(result[1].periods.len(), 1);
        assert_eq!(result[1].periods[0].period_row.id, mock_period().id);

        // No closed-periods cap: the future period is included, and periods
        // are ascending by end date
        let weekly_ids: Vec<&str> = result[2]
            .periods
            .iter()
            .map(|period| period.period_row.id.as_str())
            .collect();
        assert_eq!(weekly_ids.len(), 5);
        assert_eq!(weekly_ids.first(), Some(&mock_period_2_a().id.as_str()));
        assert_eq!(weekly_ids[3], mock_period_2_d().id.as_str());
        assert_eq!(weekly_ids.last(), Some(&future_period().id.as_str()));

        // The period filter narrows periods within each schedule; a schedule
        // none of whose periods match is still returned, empty — this is how
        // a caller asks for its current cycle onwards
        let today_2099 = NaiveDate::from_ymd_opt(2099, 5, 15).unwrap();
        let result = get_period_schedules(
            &context,
            "store_a",
            Some(PeriodFilter::new().end_date(DateFilter::after_or_equal_to(today_2099))),
        )
        .unwrap();

        assert_eq!(result.len(), 3);
        assert!(result[0].periods.is_empty());
        assert!(result[1].periods.is_empty());
        assert_eq!(result[2].periods.len(), 1);
        assert_eq!(result[2].periods[0].period_row.id, future_period().id);
    }
}
