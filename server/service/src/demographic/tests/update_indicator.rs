#[cfg(test)]

mod query {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        demographic::{
            insert_demographic_indicator::InsertDemographicIndicator,
            update_demographic_indicator::{
                UpdateDemographicIndicator, UpdateDemographicIndicatorError,
            },
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn indicator_update() {
        let (_, _connection, connection_manager, _) =
            setup_all("indicator_update", MockDataInserts::none().stores()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.demographic_service;

        let id1 = "test_id".to_string();
        let name_1 = "name".to_string();
        let base_year_1 = 2024;
        let id_2 = "test_id_2".to_string();
        let name_2 = "name2".to_string();
        let base_year_2 = 2025;

        // first insert indicator
        let indicator1 = service
            .insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id1.clone(),
                    name: name_1.clone(),
                    base_year: base_year_1,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(indicator1.id, id1);

        // add a second indicator
        let indicator2 = service
            .insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id_2.clone(),
                    name: name_2.clone(),
                    base_year: base_year_1,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(indicator2.id, id_2);

        // Check we can't update to duplicate base_year / name combination
        assert_eq!(
            service.update_demographic_indicator(
                &ctx,
                UpdateDemographicIndicator {
                    id: id_2.clone(),
                    name: Some(name_1.clone()),
                    base_year: Some(base_year_1),
                    ..Default::default()
                },
            ),
            Err(UpdateDemographicIndicatorError::DemographicIndicatorAlreadyExistsForThisYear)
        );

        // Check update will work for same name of different year
        let indicator2 = service
            .update_demographic_indicator(
                &ctx,
                UpdateDemographicIndicator {
                    id: id_2.clone(),
                    name: Some(name_1.clone()),
                    base_year: Some(base_year_2),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(indicator2.name, name_1);
        assert_eq!(indicator2.base_year, base_year_2);
    }
}
