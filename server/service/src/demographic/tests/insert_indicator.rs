#[cfg(test)]

mod query {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        demographic::insert_demographic_indicator::{
            InsertDemographicIndicator, InsertDemographicIndicatorError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn indicator_insert() {
        let (_, _connection, connection_manager, _) =
            setup_all("indicator_insert", MockDataInserts::none().stores()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.demographic_service;

        // check we can insert
        let id = "test_id".to_string();
        let id_2 = "test_id_2".to_string();
        let id_3 = "test_id_2".to_string();
        let name_1 = "name".to_string();
        let base_year_1 = 2024;
        let name_2 = "name2".to_string();
        let base_year_2 = 2025;
        let indicator = service
            .insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id.clone(),
                    name: Some(name_1.clone()),
                    base_year: base_year_1,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(indicator.id, id);

        // Check we can't insert duplicate id
        assert_eq!(
            service.insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id.clone(),
                    name: Some(name_2.clone()),
                    base_year: base_year_2,
                    ..Default::default()
                },
            ),
            Err(InsertDemographicIndicatorError::DemographicIndicatorAlreadyExists)
        );

        // Check we can't insert duplicate base_year / name combination
        assert_eq!(
            service.insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id_2.clone(),
                    name: Some(name_1.clone()),
                    base_year: base_year_1,
                    ..Default::default()
                },
            ),
            Err(InsertDemographicIndicatorError::DemographicIndicatorAlreadyExistsForThisYear)
        );

        // Check insert will work for same name of different year
        let indicator = service
            .insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id_2.clone(),
                    name: Some(name_1.clone()),
                    base_year: base_year_2,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(indicator.id, id_2);

        // check insert with None name won't work
        assert_eq!(
            service.insert_demographic_indicator(
                &ctx,
                InsertDemographicIndicator {
                    id: id_3.clone(),
                    name: None,
                    base_year: base_year_2,
                    ..Default::default()
                },
            ),
            Err(InsertDemographicIndicatorError::DemographicIndicatorHasNoName)
        );
    }
}
