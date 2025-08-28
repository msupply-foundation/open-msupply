#[cfg(test)]
mod update {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_purchase_order_b_finalised, mock_store_a, mock_user_account_a, MockDataInserts,
        },
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

        // GoodsReceivedDoesNotExist
        assert_eq!(
            service.update_goods_received(
                &context,
                UpdateGoodsReceivedInput {
                    id: "invalid_id".to_string(),
                    ..Default::default()
                },
            ),
            Err(UpdateGoodsReceivedError::GoodsReceivedDoesNotExist)
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
                purchase_order_id: Some(mock_purchase_order_b_finalised().id.clone()),
                ..Default::default()
            })
            .unwrap();

        let result = service
            .update_goods_received(
                &context,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    comment: Some("Updated comment".to_string()),
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
