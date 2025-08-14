#[cfg(test)]
mod test_update {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_goods_received_b, mock_goods_received_line_without_po_line,
            mock_goods_received_linked_to_not_finalised_purchase_order,
            mock_goods_received_linked_to_other_store_purchase_order, mock_goods_received_new,
            mock_goods_received_without_linked_purchase_order,
            mock_goods_received_without_linked_purchase_order_lines, mock_purchase_order_a,
            mock_sent_request_requisition, MockDataInserts,
        },
        GoodsReceivedLineRow, GoodsReceivedLineRowRepository, InvoiceFilter, PurchaseOrderLineRow,
        PurchaseOrderLineRowRepository, PurchaseOrderRow, PurchaseOrderRowRepository,
        RepositoryError,
    };

    use crate::service_provider::ServiceContext;

    use crate::goods_received::update::UpdateGoodsReceivedInput;

    use crate::{
        goods_received::{
            CreateGoodsReceivedShipment, CreateGoodsReceivedShipmentError as ServiceError,
        },
        requisition_line::response_requisition_line::UpdateResponseRequisitionLine,
        service_provider::ServiceProvider,
    };
    use repository::mock::{mock_new_response_program_requisition, mock_store_a, mock_store_b};
    use repository::EqualFilter;
    use repository::{
        test_db::setup_all, InvoiceLineFilter, InvoiceLineRepository, InvoiceRepository,
        InvoiceRowRepository,
    };

    struct InsertGoodsReceivedMocks {
        goods_received_id: String,
        purchase_order_id: Option<String>,
        goods_received_line_ids: Option<Vec<String>>,
        purchase_order_line_ids: Option<Vec<String>>,
    }
    // helper function to add PO, PO lines, and GR lines to make extending test case logic more easeful
    fn insert_goods_received_mocks(
        context: &ServiceContext,
        dependencies: InsertGoodsReceivedMocks,
    ) -> Result<(), RepositoryError> {
        let repository = GoodsReceivedRowRepository::new(&context.connection);
        repository
            .upsert_one(&GoodsReceivedRow {
                id: dependencies.goods_received_id.clone(),
                store_id: context.store_id.clone(),
                goods_received_number: 1,
                status: GoodsReceivedStatus::New,
                created_datetime: chrono::Utc::now().naive_utc(),
                purchase_order_id: dependencies.purchase_order_id.clone(),
                ..Default::default()
            })
            .unwrap();

        if let Some(purchase_order_id) = dependencies.purchase_order_id.clone() {
            let purchase_order_repository = PurchaseOrderRowRepository::new(&context.connection);
            purchase_order_repository
                .upsert_one(&PurchaseOrderRow {
                    id: purchase_order_id.clone(),
                    store_id: context.store_id.clone(),
                    status: repository::PurchaseOrderStatus::New,
                    created_datetime: chrono::Utc::now().naive_utc(),
                    ..Default::default()
                })
                .unwrap();
        }

        if let Some(goods_received_line_ids) = dependencies.goods_received_line_ids.clone() {
            let goods_received_line_repository =
                GoodsReceivedLineRowRepository::new(&context.connection);
            for line_id in goods_received_line_ids {
                goods_received_line_repository
                    .upsert_one(&GoodsReceivedLineRow {
                        id: line_id,
                        goods_received_id: dependencies.goods_received_id.clone(),
                        ..Default::default()
                    })
                    .unwrap();
            }
        }

        if let (Some(purchase_order_line_ids), Some(purchase_order_id)) = (
            dependencies.purchase_order_line_ids,
            dependencies.purchase_order_id,
        ) {
            let purchase_order_line_repository =
                PurchaseOrderLineRowRepository::new(&context.connection);
            for line_id in purchase_order_line_ids {
                purchase_order_line_repository
                    .upsert_one(&PurchaseOrderLineRow {
                        id: line_id,
                        purchase_order_id: purchase_order_id.clone(),
                        ..Default::default()
                    })
                    .unwrap();
            }
        }

        Ok(())
    }

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
                    goods_received_id: "invalid".to_owned(),
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
        let mocks = InsertGoodsReceivedMocks {
            goods_received_id: "test".to_string(),
            purchase_order_id: Some("test".to_string()),
            goods_received_line_ids: Some(vec!["line_id".to_string()]),
            purchase_order_line_ids: None,
        };
        insert_goods_received_mocks(&context, mocks).unwrap();
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: "test".to_string(),
                },
            ),
            Err(ServiceError::PurchaseOrderLinesNotFound(vec![
                "line_id".to_string()
            ]))
        );

        // NotThisStoreGoodsReceived
        assert_eq!(
            service.create_goods_received_shipment(
                &context,
                CreateGoodsReceivedShipment {
                    goods_received_id: mock_goods_received_b().id,
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
            Err(ServiceError::NotThisStoreGoodsReceived)
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
    async fn create_goods_received_shipment() {
        let (_, _, connection_manager, _) = setup_all(
            "create_goods_received_shipment_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.goods_received_service;

        // Create a goods received row
        let goods_received_id = "test_new_invoice_from_goods_received".to_string();

        insert_goods_received_mocks(
            &context,
            InsertGoodsReceivedMocks {
                goods_received_id: goods_received_id.clone(),
                purchase_order_id: Some("test_purchase_order".to_string()),
                goods_received_line_ids: Some(vec!["line_id".to_string()]),
                purchase_order_line_ids: Some(vec!["po_line_id".to_string()]),
            },
        )
        .unwrap();

        // finalise invoice
        service
            .update_goods_received(
                &context,
                UpdateGoodsReceivedInput {
                    id: goods_received_id.clone(),
                    status: Some(GoodsReceivedStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice_repository = InvoiceRepository::new(&context.connection);
        let result = invoice_repository
            .query_one(
                InvoiceFilter::new().goods_received_id(EqualFilter::equal_to(&goods_received_id)),
            )
            .unwrap();

        assert!(result.is_some());
    }
}
