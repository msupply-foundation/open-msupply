#[cfg(test)]
mod update {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::{
        goods_received::update::{UpdateGoodsReceivedError, UpdateGoodsReceivedInput},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_goods_received_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_goods_received_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_service;

        let store_id = &mock_store_a().id;

        // GoodsReceivedDoesNotExist
        assert_eq!(
            service.update_goods_received(
                &context,
                store_id,
                UpdateGoodsReceivedInput {
                    id: "invalid_id".to_string(),
                    ..Default::default()
                },
            ),
            Err(UpdateGoodsReceivedError::GoodsReceivedDoesNotExist)
        );

        let goods_received_id = uuid();

        // create a goods received row
        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: goods_received_id.clone(),
                store_id: store_id.clone(),
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                created_datetime: chrono::Utc::now().naive_utc(),
                ..Default::default()
            })
            .unwrap();

        // PurchaseOrderDoesNotExist
        assert_eq!(
            service.update_goods_received(
                &context,
                store_id,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    purchase_order_id: Some("invalid_purchase_order_id".to_string()),
                    ..Default::default()
                },
            ),
            Err(UpdateGoodsReceivedError::PurchaseOrderDoesNotExist)
        );

        // InboundShipmentDoesNotExist
        assert_eq!(
            service.update_goods_received(
                &context,
                store_id,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    inbound_shipment_id: Some(crate::NullableUpdate {
                        value: Some("invalid_inbound_shipment_id".to_string()),
                    }),
                    ..Default::default()
                },
            ),
            Err(UpdateGoodsReceivedError::InboundShipmentDoesNotExist)
        );

        // DonorDoesNotExist
        assert_eq!(
            service.update_goods_received(
                &context,
                store_id,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    donor_link_id: Some(crate::NullableUpdate {
                        value: Some("invalid_donor_id".to_string()),
                    }),
                    ..Default::default()
                },
            ),
            Err(UpdateGoodsReceivedError::DonorDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn update_goods_received_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_goods_received_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_service;
        let repository = GoodsReceivedRowRepository::new(&context.connection);

        let store_id = &mock_store_a().id;
        let goods_received_id = uuid();

        // Create a goods received row
        repository
            .upsert_one(&GoodsReceivedRow {
                id: goods_received_id.clone(),
                store_id: store_id.clone(),
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                comment: Some("Test comment".to_string()),
                created_datetime: chrono::Utc::now().naive_utc(),
                ..Default::default()
            })
            .unwrap();

        let result = service
            .update_goods_received(
                &context,
                store_id,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    comment: Some("Updated comment".to_string()),
                    supplier_reference: Some("REF-123".to_string()),
                    status: Some(GoodsReceivedStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        let goods_received = repository
            .find_one_by_id(&goods_received_id)
            .unwrap()
            .unwrap();

        assert_eq!(result.id, goods_received_id);
        assert_eq!(result.comment, goods_received.comment);
        assert_eq!(result.supplier_reference, goods_received.supplier_reference);
        assert_eq!(result.status, goods_received.status);
    }
}
