#[cfg(test)]
mod delete {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_purchase_order_a, mock_purchase_order_a_line_1, mock_store_a, mock_user_account_a,
            MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        goods_received_line::{
            delete::DeleteGoodsReceivedLineError, insert::InsertGoodsReceivedLineInput,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_goods_received_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_goods_received_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // GoodsReceivedLineDoesNotExist
        assert_eq!(
            service_provider
                .goods_received_line_service
                .delete_goods_received_line(&context, "goods_received_line_id_1".to_string()),
            Err(DeleteGoodsReceivedLineError::GoodsReceivedLineDoesNotExist)
        );

        // Create Goods Received
        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: "goods_received_id_1".to_string(),
                purchase_order_id: Some(mock_purchase_order_a().id),
                status: GoodsReceivedStatus::Finalised,
                store_id: mock_store_a().id.clone(),
                ..Default::default()
            })
            .unwrap();

        service_provider
            .goods_received_line_service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "goods_received_line_id_1".to_string(),
                    goods_received_id: "goods_received_id_1".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id,
                    ..Default::default()
                },
            )
            .unwrap();

        // CannotEditGoodsReceived
        assert_eq!(
            service_provider
                .goods_received_line_service
                .delete_goods_received_line(&context, "goods_received_line_id_1".to_string()),
            Err(DeleteGoodsReceivedLineError::CannotEditGoodsReceived)
        );
    }

    #[actix_rt::test]
    async fn delete_goods_received_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_goods_received_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // Create Goods Received
        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: "goods_received_id_1".to_string(),
                purchase_order_id: Some(mock_purchase_order_a().id),
                status: GoodsReceivedStatus::New,
                store_id: mock_store_a().id.clone(),
                ..Default::default()
            })
            .unwrap();

        // Create Goods Received Line
        service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "goods_received_line_id_1".to_string(),
                    goods_received_id: "goods_received_id_1".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id,
                    ..Default::default()
                },
            )
            .unwrap();

        // Delete Goods Received Line
        let id = service
            .delete_goods_received_line(&context, "goods_received_line_id_1".to_string())
            .unwrap();

        assert_eq!(id, "goods_received_line_id_1");
    }
}
