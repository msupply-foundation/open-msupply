#[cfg(test)]
mod test_update {
    use repository::{
        goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
        mock::{
            mock_goods_received_a, mock_goods_received_linked_to_not_finalised_purchase_order,
            mock_goods_received_linked_to_other_store_purchase_order, mock_goods_received_new,
            mock_goods_received_without_linked_purchase_order, mock_item_a,
            mock_item_link_from_item, MockDataInserts,
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
        service_provider::ServiceProvider,
    };
    use repository::mock::mock_store_a;
    use repository::EqualFilter;
    use repository::{test_db::setup_all, InvoiceRepository};

    #[derive(Debug, Clone)]
    struct InsertGoodsReceivedMocks {
        goods_received_id: String,
        purchase_order_id: Option<String>,
        line_ids: Option<Vec<String>>,
    }
    // helper function to add PO, PO lines, and GR lines to make extending test case logic more easeful
    fn insert_goods_received_mocks(
        context: &ServiceContext,
        dependencies: InsertGoodsReceivedMocks,
    ) -> Result<(), RepositoryError> {
        if let Some(purchase_order_id) = dependencies.purchase_order_id.clone() {
            let purchase_order_repository = PurchaseOrderRowRepository::new(&context.connection);
            purchase_order_repository
                .upsert_one(&PurchaseOrderRow {
                    id: purchase_order_id.clone(),
                    store_id: context.store_id.clone(),
                    status: repository::PurchaseOrderStatus::Finalised,
                    created_datetime: chrono::Utc::now().naive_utc(),
                    supplier_name_link_id: "name_a".to_string(),
                    purchase_order_number: 1,
                    ..Default::default()
                })
                .unwrap();
        }

        let repository = GoodsReceivedRowRepository::new(&context.connection);
        repository
            .upsert_one(&GoodsReceivedRow {
                id: dependencies.goods_received_id.clone(),
                store_id: context.store_id.clone(),
                goods_received_number: 1,
                status: GoodsReceivedStatus::Finalised,
                created_datetime: chrono::Utc::now().naive_utc(),
                purchase_order_id: dependencies.purchase_order_id.clone(),
                ..Default::default()
            })
            .unwrap();

        if let Some(line_ids) = dependencies.line_ids.clone() {
            let purchase_order_line_repository =
                PurchaseOrderLineRowRepository::new(&context.connection);
            let goods_received_line_repository =
                GoodsReceivedLineRowRepository::new(&context.connection);
            let mut line_number = 1;
            // always insert both PO lines and GR lines because GR lines have not null ref to PO lines
            for line_id in line_ids {
                purchase_order_line_repository
                    .upsert_one(&PurchaseOrderLineRow {
                        id: line_id.clone(),
                        store_id: context.store_id.clone(),
                        purchase_order_id: if let Some(purchase_order_id) =
                            dependencies.purchase_order_id.clone()
                        {
                            purchase_order_id
                        } else {
                            "purchase_order_id".to_string()
                        },
                        line_number: line_number,
                        item_link_id: mock_item_link_from_item(&mock_item_a()).id,
                        item_name: "test item name".to_string(),
                        requested_pack_size: 0.0,
                        requested_number_of_units: 0.0,
                        received_number_of_units: 0.0,
                        stock_on_hand_in_units: 0.0,
                        price_per_unit_before_discount: 0.0,
                        price_per_unit_after_discount: 0.0,
                        ..Default::default()
                    })
                    .unwrap();

                goods_received_line_repository
                    .upsert_one(&GoodsReceivedLineRow {
                        id: line_id.clone(),
                        goods_received_id: dependencies.goods_received_id.clone(),
                        purchase_order_line_id: line_id.clone(),
                        received_pack_size: 0.0,
                        number_of_packs_received: 0.0,
                        line_number: line_number,
                        item_link_id: mock_item_link_from_item(&mock_item_a()).id,
                        item_name: "test item name".to_string(),
                        ..Default::default()
                    })
                    .unwrap();
                line_number += 1;
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

        // Create a goods received row
        let goods_received_id = "test_new_invoice_from_goods_received".to_string();

        insert_goods_received_mocks(
            &context,
            InsertGoodsReceivedMocks {
                goods_received_id: goods_received_id.clone(),
                purchase_order_id: Some("po_gr_invoice_create_id".to_string()),
                line_ids: Some(vec!["line_id".to_string()]),
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
