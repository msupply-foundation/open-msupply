#[cfg(test)]
mod query {
    use repository::mock::{
        mock_period_schedule_1, mock_period_schedule_2, MockData, MockDataInserts,
    };
    use repository::test_db::setup_all_with_data;
    use repository::{EqualFilter, PeriodScheduleFilter, PeriodScheduleRow};

    use crate::period_schedule::get_period_schedules;
    use crate::service_provider::ServiceProvider;

    fn empty_schedule() -> PeriodScheduleRow {
        PeriodScheduleRow {
            id: "empty_schedule".to_string(),
            name: "Empty".to_string(),
        }
    }

    #[actix_rt::test]
    async fn get_period_schedules_query() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_period_schedules_query",
            MockDataInserts::none().periods(),
            MockData {
                period_schedules: vec![empty_schedule()],
                ..MockData::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let result = get_period_schedules(&context.connection, None).unwrap();

        // Every schedule, sorted by name: Empty, Monthly, Weekly — a schedule
        // with no periods is still returned
        assert_eq!(result.count, 3);
        assert_eq!(result.rows[0].id, empty_schedule().id);
        assert_eq!(result.rows[1].id, mock_period_schedule_1().id);
        assert_eq!(result.rows[2].id, mock_period_schedule_2().id);

        let result = get_period_schedules(
            &context.connection,
            Some(
                PeriodScheduleFilter::new()
                    .id(EqualFilter::equal_to(mock_period_schedule_2().id.clone())),
            ),
        )
        .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, mock_period_schedule_2().id);
    }
}
