#[cfg(test)]
mod tests {
    use repository::EqualFilter;
    use repository::ancillary_item::AncillaryItemFilter;
    use repository::mock::{MockDataInserts, mock_item_a, mock_item_b, mock_item_c};
    use repository::test_db::setup_all;

    use crate::item::ancillary_item::{
        DeleteAncillaryItem, DeleteAncillaryItemError, UpsertAncillaryItem,
        UpsertAncillaryItemError,
    };
    use crate::service_provider::ServiceProvider;
    use crate::sync::test_util_set_is_central_server;

    // The central-server flag is a process-wide static, so all sub-cases live in one test
    // function to avoid races with the test runner's parallel execution.
    #[actix_rt::test]
    async fn ancillary_item_service() {
        let (_, _, connection_manager, _) =
            setup_all("ancillary_item_service", MockDataInserts::none().items()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;

        // ---- Non-central server is rejected ----
        test_util_set_is_central_server(false);
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "r1".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::NotCentralServer);

        let err = service
            .delete_ancillary_item(
                &context,
                DeleteAncillaryItem {
                    id: "r1".to_string(),
                },
            )
            .unwrap_err();
        assert_eq!(err, DeleteAncillaryItemError::NotCentralServer);

        // ---- Central server: validations and CRUD happy path ----
        test_util_set_is_central_server(true);

        // Ratio must be > 0
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "r1".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 0.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::RatioMustBePositive);

        // FK: principal must exist
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "r2".to_string(),
                    item_id: "does_not_exist".to_string(),
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::PrincipalItemDoesNotExist);

        // FK: ancillary must exist
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "r3".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: "does_not_exist".to_string(),
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::AncillaryItemDoesNotExist);

        // Self-link rejected (delegated to repository validator)
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "r4".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_a().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::CanNotLinkItemWithItself);

        // Create A -> B
        let row = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ab".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: Some(true),
                },
            )
            .unwrap();
        assert_eq!(row.ancillary_quantity, 1.0);
        assert!(row.exclude_principal_wastage);

        // Re-saving without the flag keeps it; saving it off clears it
        let resave = |flag: Option<bool>| {
            service
                .upsert_ancillary_item(
                    &context,
                    UpsertAncillaryItem {
                        id: "ab".to_string(),
                        item_id: mock_item_a().id,
                        ancillary_item_id: mock_item_b().id,
                        item_quantity: 1.0,
                        ancillary_quantity: 2.0,
                        exclude_principal_wastage: flag,
                    },
                )
                .unwrap()
        };
        assert!(resave(None).exclude_principal_wastage);
        assert!(!resave(Some(false)).exclude_principal_wastage);

        // Cycle: B -> A would close A -> B -> A
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ba".to_string(),
                    item_id: mock_item_b().id,
                    ancillary_item_id: mock_item_a().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::CycleDetected);

        // Duplicate (principal, ancillary) pair with a different id is rejected
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ab_duplicate".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 3.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap_err();
        assert_eq!(err, UpsertAncillaryItemError::DuplicateAncillaryItem);

        // Updating the existing row (same pair, same id) is allowed and updates the ratio
        service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ab".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 5.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap();

        let updated = service
            .get_ancillary_items(
                &context,
                None,
                Some(AncillaryItemFilter::new().id(EqualFilter::equal_to("ab".to_string()))),
            )
            .unwrap();
        assert_eq!(updated.count, 1);
        assert_eq!(updated.rows[0].ancillary_quantity, 5.0);

        // A different ancillary against the same principal is allowed
        service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ac".to_string(),
                    item_id: mock_item_a().id,
                    ancillary_item_id: mock_item_c().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                    exclude_principal_wastage: None,
                },
            )
            .unwrap();

        // Soft delete removes the row from queries
        service
            .delete_ancillary_item(
                &context,
                DeleteAncillaryItem {
                    id: "ab".to_string(),
                },
            )
            .unwrap();
        let after_delete = service
            .get_ancillary_items(
                &context,
                None,
                Some(AncillaryItemFilter::new().id(EqualFilter::equal_to("ab".to_string()))),
            )
            .unwrap();
        assert_eq!(after_delete.count, 0);
    }

    #[actix_rt::test]
    async fn supply_wastage_rate_service() {
        use crate::item::ancillary_item::{
            SetSupplyWastageRate, SetSupplyWastageRateError, supply_wastage_rates,
        };

        let (_, connection, connection_manager, _) =
            setup_all("supply_wastage_rate_service", MockDataInserts::none().items()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_service;
        let set = |item_id: String, wastage_rate: f64| {
            service.set_supply_wastage_rate(
                &context,
                SetSupplyWastageRate {
                    item_id,
                    wastage_rate,
                },
            )
        };

        test_util_set_is_central_server(false);
        assert_eq!(
            set(mock_item_a().id, 10.0),
            Err(SetSupplyWastageRateError::NotCentralServer)
        );

        test_util_set_is_central_server(true);
        assert_eq!(
            set(mock_item_a().id, 100.0),
            Err(SetSupplyWastageRateError::RateOutOfRange)
        );
        assert_eq!(
            set(mock_item_a().id, -1.0),
            Err(SetSupplyWastageRateError::RateOutOfRange)
        );
        assert_eq!(
            set("no_such_item".to_string(), 10.0),
            Err(SetSupplyWastageRateError::ItemDoesNotExist)
        );

        // Set, then changed in place rather than a second row
        assert_eq!(set(mock_item_a().id, 10.0), Ok(10.0));
        assert_eq!(set(mock_item_a().id, 15.0), Ok(15.0));
        let rates = supply_wastage_rates(&connection, &[mock_item_a().id, mock_item_b().id]).unwrap();
        assert_eq!(rates.get(&mock_item_a().id), Some(&15.0));
        assert_eq!(rates.get(&mock_item_b().id), None);

        // 0 clears it
        assert_eq!(set(mock_item_a().id, 0.0), Ok(0.0));
        let rates = supply_wastage_rates(&connection, &[mock_item_a().id]).unwrap();
        assert_eq!(rates.get(&mock_item_a().id), Some(&0.0));
    }
}
