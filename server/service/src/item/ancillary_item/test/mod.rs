#[cfg(test)]
mod tests {
    use repository::ancillary_item::AncillaryItemFilter;
    use repository::mock::{mock_item_a, mock_item_b, mock_item_c, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::EqualFilter;

    use crate::item::ancillary_item::{
        DeleteAncillaryItem, DeleteAncillaryItemError, UpsertAncillaryItem,
        UpsertAncillaryItemError,
    };
    use crate::service_provider::ServiceProvider;
    use crate::sync::test_util_set_is_central_server;

    // The central-server flag is a process-wide static, so all sub-cases live in one test
    // function to avoid races with the test runner's parallel execution. Mock items
    // auto-create item_link rows with the same id, so `mock_item_a().id` doubles as a
    // valid `item_link_id`.
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 0.0,
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
                    item_link_id: "does_not_exist".to_string(),
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: "does_not_exist".to_string(),
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_a().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                },
            )
            .unwrap();
        assert_eq!(row.ancillary_quantity, 1.0);

        // Cycle: B -> A would close A -> B -> A
        let err = service
            .upsert_ancillary_item(
                &context,
                UpsertAncillaryItem {
                    id: "ba".to_string(),
                    item_link_id: mock_item_b().id,
                    ancillary_item_link_id: mock_item_a().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 3.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_b().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 5.0,
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
                    item_link_id: mock_item_a().id,
                    ancillary_item_link_id: mock_item_c().id,
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
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
}
