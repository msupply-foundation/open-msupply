#[cfg(test)]
mod insert {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_purchase_order_a, mock_purchase_order_a_line_1, mock_purchase_order_a_line_2,
            mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        GoodsReceivedLineRowRepository, GoodsReceivedLineStatus,
    };

    use crate::{
        goods_received::insert::InsertGoodsReceivedInput,
        goods_received_line::insert::{
            InsertGoodsReceivedLineError, InsertGoodsReceivedLineInput,
            InsertGoodsReceivedLinesError, InsertGoodsReceivedLinesFromPurchaseOrderInput,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_goods_received_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_goods_received_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // GoodsReceivedDoesNotExist
        assert_eq!(
            service.insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "test_id".to_string(),
                    goods_received_id: "non_existent_goods_received".to_string(),
                    purchase_order_line_id: "non_existent_purchase_order_line".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertGoodsReceivedLineError::GoodsReceivedDoesNotExist)
        );

        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: "goods_received_id".to_string(),
                store_id: mock_store_a().id,
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                ..Default::default()
            })
            .unwrap();

        // PurchaseOrderLineDoesNotExist
        assert_eq!(
            service.insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "test_id".to_string(),
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: "non_existent_purchase_order_line".to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertGoodsReceivedLineError::PurchaseOrderLineDoesNotExist)
        );

        service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "test_id".to_string(),
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        // GoodsReceivedLineAlreadyExists
        assert_eq!(
            service.insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "test_id".to_string(),
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    ..Default::default()
                }
            ),
            Err(InsertGoodsReceivedLineError::GoodsReceivedLineAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_goods_received_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_goods_received_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // Create Goods Received
        let goods_received = service_provider
            .goods_received_service
            .insert_goods_received(
                &context,
                &mock_store_a().id,
                InsertGoodsReceivedInput {
                    id: "goods_received_id_1".to_string(),
                    purchase_order_id: mock_purchase_order_a().id.to_string(),
                },
            )
            .unwrap();

        let result = service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "test_id".to_string(),
                    goods_received_id: goods_received.id.clone(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        let goods_received_line = GoodsReceivedLineRowRepository::new(&context.connection)
            .find_one_by_id(&result.id)
            .unwrap()
            .unwrap();

        assert_eq!(goods_received_line.id, result.id);
        assert_eq!(goods_received_line.goods_received_id, goods_received.id);
        assert_eq!(
            goods_received_line.purchase_order_line_id,
            mock_purchase_order_a_line_1().id
        );
    }

    #[actix_rt::test]
    async fn insert_goods_received_lines_from_purchase_order_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_goods_received_lines_from_purchase_order_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // GoodsReceivedDoesNotExist
        assert_eq!(
            service.insert_goods_received_lines_from_purchase_order(
                &context,
                InsertGoodsReceivedLinesFromPurchaseOrderInput {
                    goods_received_id: "non_existent_goods_received".to_string(),
                    purchase_order_id: "purchase_order_id".to_string(),
                }
            ),
            Err(InsertGoodsReceivedLinesError::GoodsReceivedDoesNotExist)
        );

        // Create Goods Received
        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: "goods_received_id".to_string(),
                store_id: mock_store_a().id,
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                ..Default::default()
            })
            .unwrap();

        // PurchaseOrderNotFound
        assert_eq!(
            service.insert_goods_received_lines_from_purchase_order(
                &context,
                InsertGoodsReceivedLinesFromPurchaseOrderInput {
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_id: "non_existent_purchase_order".to_string(),
                }
            ),
            Err(InsertGoodsReceivedLinesError::PurchaseOrderNotFound)
        );
    }

    #[actix_rt::test]
    async fn insert_goods_received_lines_from_purchase_order_success() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_goods_received_lines_from_purchase_order_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // Create goods received
        let goods_received = service_provider
            .goods_received_service
            .insert_goods_received(
                &context,
                &mock_store_a().id,
                InsertGoodsReceivedInput {
                    id: "goods_received_id".to_string(),
                    purchase_order_id: mock_purchase_order_a().id.to_string(),
                },
            )
            .unwrap();

        // Insert goods received lines from purchase order
        let result_lines = service
            .insert_goods_received_lines_from_purchase_order(
                &context,
                InsertGoodsReceivedLinesFromPurchaseOrderInput {
                    goods_received_id: goods_received.id.clone(),
                    purchase_order_id: mock_purchase_order_a().id.to_string(),
                },
            )
            .unwrap();

        // Should have created 2 lines
        assert_eq!(result_lines.len(), 2);

        // Verify all lines were created with correct data
        let goods_received_line_repo = GoodsReceivedLineRowRepository::new(&context.connection);

        // Line 1
        let goods_received_line_1 = goods_received_line_repo
            .find_one_by_id(&result_lines[0].id)
            .unwrap()
            .unwrap();
        assert_eq!(goods_received_line_1.id, result_lines[0].id);
        assert_eq!(goods_received_line_1.goods_received_id, goods_received.id);
        assert_eq!(
            result_lines[0].status,
            GoodsReceivedLineStatus::Unauthorised
        );
        assert_eq!(result_lines[0].number_of_packs_received, 0.0);
        assert_eq!(
            goods_received_line_1.item_link_id,
            mock_purchase_order_a_line_1().item_link_id
        );
        assert_eq!(
            goods_received_line_1.item_name,
            mock_purchase_order_a_line_1().item_name
        );
        assert_eq!(
            goods_received_line_1.received_pack_size,
            mock_purchase_order_a_line_1().requested_pack_size
        );
        assert_eq!(
            goods_received_line_1.line_number,
            mock_purchase_order_a_line_1().line_number
        );

        // Line 2
        let goods_received_line_2 = goods_received_line_repo
            .find_one_by_id(&result_lines[1].id)
            .unwrap()
            .unwrap();

        assert_eq!(goods_received_line_2.id, result_lines[1].id);
        assert_eq!(goods_received_line_2.goods_received_id, goods_received.id);
        assert_eq!(
            result_lines[1].status,
            GoodsReceivedLineStatus::Unauthorised
        );
        assert_eq!(result_lines[1].number_of_packs_received, 0.0);
        assert_eq!(
            goods_received_line_2.item_link_id,
            mock_purchase_order_a_line_2().item_link_id
        );
        assert_eq!(
            goods_received_line_2.item_name,
            mock_purchase_order_a_line_2().item_name
        );
        assert_eq!(
            goods_received_line_2.received_pack_size,
            mock_purchase_order_a_line_2().requested_pack_size
        );
        assert_eq!(
            goods_received_line_2.line_number,
            mock_purchase_order_a_line_2().line_number
        );
    }
}
