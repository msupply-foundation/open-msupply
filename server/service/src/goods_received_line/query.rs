// use repository::{
//     EqualFilter, PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter,
//     PurchaseOrderLineRepository, PurchaseOrderLineSort, RepositoryError,
// };

// use crate::{
//     get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
// };

use crate::{get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListResult};

use repository::{
    EqualFilter, GoodsReceivedLine, GoodsReceivedLineFilter, GoodsReceivedLineRepository,
    GoodsReceivedLineSort, PaginationOption, RepositoryError,
};

use crate::ListError;

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_goods_received_lines(
    ctx: &ServiceContext,
    goods_received_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<GoodsReceivedLineFilter>,
    sort: Option<GoodsReceivedLineSort>,
) -> Result<ListResult<GoodsReceivedLine>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.goods_received_id = goods_received_id_option.map(EqualFilter::equal_to);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_goods_received_line(
    ctx: &ServiceContext,
    goods_received_id_option: Option<&str>,
    id: &str,
) -> Result<Option<GoodsReceivedLine>, RepositoryError> {
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);
    let mut filter = GoodsReceivedLineFilter::new().id(EqualFilter::equal_to(id));
    filter.goods_received_id = goods_received_id_option.map(EqualFilter::equal_to);

    Ok(repository.query_by_filter(filter)?.pop())
}

// NTSZ: Modify tests
// #[cfg(test)]
// mod test {
//     use crate::service_provider::ServiceProvider;
//     use repository::mock::{mock_item_a, mock_name_c, mock_store_a};
//     use repository::{db_diesel::GoodsReceivedLineRow, mock::MockDataInserts, test_db::setup_all};
//     use repository::{
//         EqualFilter, GoodsReceivedLineFilter, GoodsReceivedLineRowRepository, GoodsReceivedRow,
//         GoodsReceivedRowRepository,
//     };

//     #[actix_rt::test]
//     async fn goods_received_service_queries() {
//         let (_, connection, connection_manager, _) = setup_all(
//             "goods received line service queries",
//             MockDataInserts::none().stores().items(),
//         )
//         .await;

//         let service_provider = ServiceProvider::new(connection_manager);
//         let context = service_provider.basic_context().unwrap();
//         let service = service_provider.goods_received_line_service;
//         let repo = GoodsReceivedLineRowRepository::new(&connection);

//         // add a goods receipt
//         let goods_received_repo = GoodsReceivedRowRepository::new(&connection);
//         let goods_received_id = "test_goods_received_1";
//         let goods_receipt = GoodsReceivedRow {

//             // id: goods_received_id.to_string(),
//             // store_id: mock_store_a().id,
//             // supplier_name_link_id: mock_name_c().id,
//             // created_datetime: chrono::Utc::now().naive_utc(),
//             // status: repository::PurchaseOrderStatus::New,
//             // purchase_order_number: 1,
//             // ..Default::default()
//         };
//         purchase_order_repo.upsert_one(&po).unwrap();

//         let result = purchase_order_repo.find_all().unwrap();
//         assert_eq!(result.len(), 1);
//         let po_line_id = "test_po_line_1";
//         let po_line = PurchaseOrderLineRow {
//             id: po_line_id.to_string(),
//             purchase_order_id: purchase_order_id.to_string(),
//             store_id: mock_store_a().id,
//             line_number: 1,
//             item_link_id: mock_item_a().id,
//             item_name: mock_item_a().name,
//             ..Default::default()
//         };
//         let result = repo.upsert_one(&po_line);
//         assert!(result.is_ok());

//         // Test querying by ID
//         let result = service
//             .get_purchase_order_line(&context, Some("wrong_store_id"), &po_line.id)
//             .unwrap();
//         assert!(result.is_none());

//         let result = service
//             .get_purchase_order_line(&context, Some(&mock_store_a().id), "wrong_line_id")
//             .unwrap();
//         assert!(result.is_none());

//         let result = service
//             .get_purchase_order_line(&context, Some(&mock_store_a().id), po_line_id)
//             .unwrap();
//         assert!(result.is_some());

//         // Test querying with wrong store id
//         let result =
//             service.get_purchase_order_lines(&context, Some("wrong_store_id"), None, None, None);
//         assert!(result.is_ok());
//         assert_eq!(result.unwrap().count, 0);

//         let result =
//             service.get_purchase_order_lines(&context, Some(&mock_store_a().id), None, None, None);
//         assert!(result.is_ok());
//         assert_eq!(result.unwrap().count, 1);

//         // Test querying with filter
//         let filter =
//             PurchaseOrderLineFilter::new().purchase_order_id(EqualFilter::equal_to("wrong_po_id"));
//         let result = service.get_purchase_order_lines(
//             &context,
//             Some(&mock_store_a().id),
//             None,
//             Some(filter),
//             None,
//         );
//         assert!(result.is_ok());
//         assert_eq!(result.unwrap().count, 0);

//         let filter = PurchaseOrderLineFilter::new()
//             .purchase_order_id(EqualFilter::equal_to(&purchase_order_id));
//         let result = service.get_purchase_order_lines(
//             &context,
//             Some(&mock_store_a().id),
//             None,
//             Some(filter),
//             None,
//         );
//         assert!(result.is_ok());
//         assert_eq!(result.unwrap().count, 1);
//     }
// }
