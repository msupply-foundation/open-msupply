#[cfg(test)]
mod query {
    use repository::{
        mock::MockDataInserts,
        temperature_breach_config::{
            TemperatureBreachConfigFilter, TemperatureBreachConfigSortField,
        },
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn temperature_breach_config_service_pagination() {
        let (_, _, connection_manager, _) = setup_all(
            "test_temperature_breach_config_service_pagination",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.temperature_breach_config_service;

        assert_eq!(
            service.get_temperature_breach_configs(
                &context,
                Some(PaginationOption {
                    limit: Some(2000),
                    offset: None
                }),
                None,
                None,
            ),
            Err(ListError::LimitAboveMax(1000))
        );

        assert_eq!(
            service.get_temperature_breach_configs(
                &context,
                Some(PaginationOption {
                    limit: Some(0),
                    offset: None,
                }),
                None,
                None,
            ),
            Err(ListError::LimitBelowMin(1))
        );
    }

    #[actix_rt::test]
    async fn temperature_breach_config_service_single_record() {
        let (_, _, connection_manager, _) = setup_all(
            "test_temperature_breach_config_single_record",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.temperature_breach_config_service;

        assert_eq!(
            service.get_temperature_breach_config(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_temperature_breach_config(
                &context,
                "temperature_breach_config_is_active".to_owned(),
            )
            .unwrap();

        assert_eq!(
            result.temperature_breach_config_row.id,
            "temperature_breach_config_is_active"
        );
        assert_eq!(result.temperature_breach_config_row.is_active, true);
    }

    #[actix_rt::test]
    async fn temperature_breach_config_service_filter() {
        let (_, _, connection_manager, _) = setup_all(
            "test_temperature_breach_config_filter",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.temperature_breach_config_service;

        let result = service
            .get_temperature_breach_configs(
                &context,
                None,
                Some(
                    TemperatureBreachConfigFilter::new()
                        .id(EqualFilter::equal_to("temperature_breach_config_1")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].temperature_breach_config_row.id,
            "temperature_breach_config_1"
        );

        let result = service
            .get_temperature_breach_configs(
                &context,
                None,
                Some(
                    TemperatureBreachConfigFilter::new().id(EqualFilter::equal_any(vec![
                        "temperature_breach_config_1".to_owned(),
                        "temperature_breach_config_is_active".to_owned(),
                    ])),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(
            result.rows[0].temperature_breach_config_row.id,
            "temperature_breach_config_1"
        );
        assert_eq!(
            result.rows[1].temperature_breach_config_row.id,
            "temperature_breach_config_is_active"
        );
    }

    #[actix_rt::test]
    async fn temperature_breach_config_service_sort() {
        let (mock_data, _, connection_manager, _) = setup_all(
            "test_temperature_breach_config_sort",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.temperature_breach_config_service;
        // Test Description sort with default sort order
        let result = service
            .get_temperature_breach_configs(
                &context,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachConfigSortField::Description,
                    desc: None,
                }),
            )
            .unwrap();

        let mut temperature_breach_configs = mock_data["base"].temperature_breach_configs.clone();
        temperature_breach_configs.sort_by(|a, b| {
            a.description
                .to_lowercase()
                .cmp(&b.description.to_lowercase())
        });

        let result_descriptions: Vec<String> = result
            .rows
            .into_iter()
            .map(|temperature_breach_config| {
                temperature_breach_config
                    .temperature_breach_config_row
                    .description
            })
            .collect();
        let sorted_descriptions: Vec<String> = temperature_breach_configs
            .into_iter()
            .map(|temperature_breach_config| temperature_breach_config.description)
            .collect();

        assert_eq!(result_descriptions, sorted_descriptions);

        // Test Description sort with desc sort
        let result = service
            .get_temperature_breach_configs(
                &context,
                None,
                None,
                Some(Sort {
                    key: TemperatureBreachConfigSortField::Description,
                    desc: Some(true),
                }),
            )
            .unwrap();

        let mut temperature_breach_configs = mock_data["base"].temperature_breach_configs.clone();
        temperature_breach_configs.sort_by(|a, b| {
            b.description
                .to_lowercase()
                .cmp(&a.description.to_lowercase())
        });

        let result_descriptions: Vec<String> = result
            .rows
            .into_iter()
            .map(|temperature_breach_config| {
                temperature_breach_config
                    .temperature_breach_config_row
                    .description
            })
            .collect();
        let sorted_descriptions: Vec<String> = temperature_breach_configs
            .into_iter()
            .map(|temperature_breach_config| temperature_breach_config.description)
            .collect();

        assert_eq!(result_descriptions, sorted_descriptions);
    }
}
