#[cfg(test)]
mod test_update {
    use repository::{
        goods_received_row::GoodsReceivedStatus,
        mock::{
            mock_goods_received_a, mock_goods_received_linked_to_not_finalised_purchase_order,
            mock_goods_received_linked_to_other_store_purchase_order, mock_goods_received_new,
            mock_goods_received_without_linked_purchase_order, MockDataInserts,
        },
    };

    use crate::goods_received::update::UpdateGoodsReceivedInput;

    use crate::{
        goods_received::{
            CreateGoodsReceivedShipment, CreateGoodsReceivedShipmentError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::mock::mock_store_a;
    use repository::test_db::setup_all;

    #[actix_rt::test]
    async fn create_goods_received_shipment_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "create_goods_received_shipment_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.goods_received_service;
        // GoodsReceivedDoesNotExist,
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: "invalid".to_string(),
                },
            ),
            Err(ServiceError::GoodsReceivedDoesNotExist)
        );

        // PurchaseOrderDoesNotExist
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_without_linked_purchase_order().id,
                },
            ),
            Err(ServiceError::PurchaseOrderDoesNotExist)
        );
        // PurchaseOrderLineNotFound
        // not testing this case due to foreign key constraint

        // NotThisStoreGoodsReceived
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_a().id,
                },
            ),
            Err(ServiceError::NotThisStoreGoodsReceived)
        );

        // NotThisStorePurchaseOrder
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_linked_to_other_store_purchase_order()
                        .id,
                },
            ),
            Err(ServiceError::NotThisStorePurchaseOrder)
        );
        // GoodsReceivedNotFinalised
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_new().id,
                },
            ),
            Err(ServiceError::GoodsReceivedNotFinalised)
        );
        // PurchaseOrderNotFinalised
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_linked_to_not_finalised_purchase_order()
                        .id,
                },
            ),
            Err(ServiceError::PurchaseOrderNotFinalised)
        );
    }

    #[actix_rt::test]
    async fn create_goods_received_shipment_success() {
        let (_, _, connection_manager, _) = setup_all(
            "create_goods_received_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.goods_received_service;

        // finalise invoice
        service
            .update_goods_received(
                &context,
                UpdateGoodsReceivedInput {
                    id: mock_goods_received_new().id.clone(),
                    status: Some(GoodsReceivedStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        // Will be removed with goods_received
        // let invoice_repository = InvoiceRepository::new(&context.connection);
        // let result = invoice_repository
        //     .query_one(
        //         InvoiceFilter::new()
        //             .purchase_order_id(EqualFilter::equal_to(mock_purchase_order_a().id)),
        //     )
        //     .unwrap();

        // assert!(result.is_some());

        // // confirm that stock_in_lines have been added to new invoice
        // let invoice_lines = InvoiceLineRowRepository::new(&context.connection)
        //     .find_many_by_invoice_id(&result.unwrap().invoice_row.id)
        //     .unwrap();

        // assert_eq!(invoice_lines.len(), 1);
    }
}
