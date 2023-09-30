#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{
        mock::MockDataInserts,
        temperature_breach::{TemperatureBreachFilter, TemperatureBreachRepository},
        test_db::setup_all,
    };

    use crate::{
        service_provider::ServiceProvider,
        temperature_breach::update::{UpdateTemperatureBreach, UpdateTemperatureBreachError},
    };

    #[actix_rt::test]
    async fn temperature_breach_service_update_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "temperature_breach_service_update_errors",
            MockDataInserts::all(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_repository = TemperatureBreachRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_service;

        let temperature_breachs_not_in_store = temperature_breach_repository
            .query_by_filter(
                TemperatureBreachFilter::new().store_id(EqualFilter::not_equal_to("store_a")),
            )
            .unwrap();

        // TemperatureBreach does not exist
        assert_eq!(
            service.update_temperature_breach(
                &context,
                UpdateTemperatureBreach {
                    id: "invalid".to_owned(),
                    acknowledged: None
                },
            ),
            Err(UpdateTemperatureBreachError::TemperatureBreachDoesNotExist)
        );

        // TemperatureBreach for another store
        assert_eq!(
            service.update_temperature_breach(
                &context,
                UpdateTemperatureBreach {
                    id: temperature_breachs_not_in_store[0]
                        .temperature_breach_row
                        .id
                        .clone(),
                    acknowledged: None
                },
            ),
            Err(UpdateTemperatureBreachError::TemperatureBreachDoesNotBelongToCurrentStore)
        );
    }
    #[actix_rt::test]
    async fn temperature_breach_service_update_success() {
        let (_, _, connection_manager, _) = setup_all(
            "temperature_breach_service_update_success",
            MockDataInserts::all(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let temperature_breach_repository = TemperatureBreachRepository::new(&connection);
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.temperature_breach_service;

        let temperature_breachs_in_store = temperature_breach_repository
            .query_by_filter(
                TemperatureBreachFilter::new().store_id(EqualFilter::equal_to("store_a")),
            )
            .unwrap();

        // Success with no changes
        let temperature_breach = temperature_breachs_in_store[0].clone();
        assert_eq!(
            service.update_temperature_breach(
                &context,
                UpdateTemperatureBreach {
                    id: temperature_breach.temperature_breach_row.id.clone(),
                    acknowledged: None
                },
            ),
            Ok(temperature_breach.clone())
        );

        assert_eq!(
            temperature_breach_repository
                .query_by_filter(TemperatureBreachFilter::new().id(EqualFilter::equal_to(
                    &temperature_breach.temperature_breach_row.id
                )))
                .unwrap()[0],
            temperature_breach
        );

        // Success with all changes
        let mut temperature_breach = temperature_breachs_in_store[1].clone();
        temperature_breach.temperature_breach_row.acknowledged =
            !temperature_breach.temperature_breach_row.acknowledged;

        assert_eq!(
            service.update_temperature_breach(
                &context,
                UpdateTemperatureBreach {
                    id: temperature_breach.temperature_breach_row.id.clone(),
                    acknowledged: Some(temperature_breach.temperature_breach_row.acknowledged),
                },
            ),
            Ok(temperature_breach.clone())
        );

        assert_eq!(
            temperature_breach_repository
                .query_by_filter(TemperatureBreachFilter::new().id(EqualFilter::equal_to(
                    &temperature_breach.temperature_breach_row.id
                )))
                .unwrap()[0],
            temperature_breach
        );
    }
}
