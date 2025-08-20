#[cfg(test)]
mod save_goods_received_lines {
    use chrono::NaiveDate;
    use repository::{
        goods_received_line_row::GoodsReceivedLineRowRepository,
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_purchase_order_a, mock_purchase_order_a_line_1, mock_purchase_order_a_line_2,
            mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        goods_received_line::{
            insert::InsertGoodsReceivedLineInput,
            save_goods_received_lines::{
                SaveGoodsReceivedLine, SaveGoodsReceivedLinesError, SaveGoodsReceivedLinesInput,
            },
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn save_goods_received_lines_errors() {
        let (_, _, connection_manager, _) =
            setup_all("save_goods_received_lines_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // GoodsReceivedDoesNotExist
        assert_eq!(
            service.save_goods_received_lines(
                &context,
                SaveGoodsReceivedLinesInput {
                    goods_received_id: "non_existent_goods_received".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    lines: vec![SaveGoodsReceivedLine {
                        id: "line_1".to_string(),
                        batch: Some("batch_1".to_string()),
                        expiry_date: None,
                        number_of_packs_received: Some(10.0),
                        received_pack_size: Some(1.0),
                        manufacturer_id: None,
                        comment: None,
                    }],
                }
            ),
            Err(SaveGoodsReceivedLinesError::GoodsReceivedDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn save_goods_received_lines_success() {
        let (_, _, connection_manager, _) =
            setup_all("save_goods_received_lines_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.goods_received_line_service;

        // Create a new goods received
        GoodsReceivedRowRepository::new(&context.connection)
            .upsert_one(&GoodsReceivedRow {
                id: "goods_received_id".to_string(),
                store_id: mock_store_a().id,
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                purchase_order_id: Some(mock_purchase_order_a().id),
                ..Default::default()
            })
            .unwrap();

        // Create an existing line to test update and delete scenarios
        service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "existing_line".to_string(),
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    batch: None,
                    expiry_date: None,
                    number_of_packs_received: None,
                    received_pack_size: None,
                    manufacturer_id: None,
                    comment: None,
                },
            )
            .unwrap();

        service
            .insert_goods_received_line(
                &context,
                InsertGoodsReceivedLineInput {
                    id: "line_to_delete".to_string(),
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_2().id.to_string(),
                    batch: None,
                    expiry_date: None,
                    number_of_packs_received: None,
                    received_pack_size: None,
                    manufacturer_id: None,
                    comment: None,
                },
            )
            .unwrap();

        // Operation with insert, update, and delete
        service
            .save_goods_received_lines(
                &context,
                SaveGoodsReceivedLinesInput {
                    goods_received_id: "goods_received_id".to_string(),
                    purchase_order_line_id: mock_purchase_order_a_line_1().id.to_string(),
                    lines: vec![
                        // UPDATES - Note: "existing_line" is updated
                        SaveGoodsReceivedLine {
                            id: "existing_line".to_string(),
                            batch: Some("updated_batch".to_string()),
                            expiry_date: Some(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap()),
                            number_of_packs_received: Some(15.0),
                            received_pack_size: Some(2.0),
                            manufacturer_id: None,
                            comment: Some("Updated comment".to_string()),
                        },
                        // INSERTS - Note: "new_line" is inserted
                        SaveGoodsReceivedLine {
                            id: "new_line".to_string(),
                            batch: Some("new_batch".to_string()),
                            expiry_date: Some(NaiveDate::from_ymd_opt(2026, 6, 30).unwrap()),
                            number_of_packs_received: Some(20.0),
                            received_pack_size: Some(1.0),
                            manufacturer_id: None,
                            comment: Some("New line comment".to_string()),
                        },
                        // DELETES - Note: "line_to_delete" is not included, so it will get deleted
                    ],
                },
            )
            .unwrap();

        // Verify the updated line
        let updated_line = GoodsReceivedLineRowRepository::new(&context.connection)
            .find_one_by_id("existing_line")
            .unwrap()
            .unwrap();

        assert_eq!(updated_line.batch, Some("updated_batch".to_string()));
        assert_eq!(
            updated_line.expiry_date,
            Some(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap())
        );
        assert_eq!(updated_line.number_of_packs_received, 15.0);
        assert_eq!(updated_line.received_pack_size, 2.0);
        assert_eq!(updated_line.comment, Some("Updated comment".to_string()));

        // Verify the new line was inserted
        let new_line = GoodsReceivedLineRowRepository::new(&context.connection)
            .find_one_by_id("new_line")
            .unwrap()
            .unwrap();

        assert_eq!(new_line.goods_received_id, "goods_received_id");
        assert_eq!(new_line.batch, Some("new_batch".to_string()));
        assert_eq!(
            new_line.expiry_date,
            Some(NaiveDate::from_ymd_opt(2026, 6, 30).unwrap())
        );
        assert_eq!(new_line.number_of_packs_received, 20.0);
        assert_eq!(new_line.received_pack_size, 1.0);
        assert_eq!(new_line.comment, Some("New line comment".to_string()));

        // Verify the line was deleted
        let deleted_line = GoodsReceivedLineRowRepository::new(&context.connection)
            .find_one_by_id("line_to_delete")
            .unwrap();

        assert!(deleted_line.is_none());
    }
}
