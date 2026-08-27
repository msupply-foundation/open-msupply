use crate::{i64_to_u32, service_provider::ServiceContext, ListError, ListResult};
use repository::shipping_method::{ShippingMethod, ShippingMethodFilter, ShippingMethodRepository};

pub fn get_shipping_methods(
    ctx: &ServiceContext,
    filter: Option<ShippingMethodFilter>,
) -> Result<ListResult<ShippingMethod>, ListError> {
    let repository = ShippingMethodRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

#[cfg(test)]
mod test {
    use repository::{
        mock::MockDataInserts,
        shipping_method_row::{ShippingMethodRow, ShippingMethodRowRepository},
        test_db::setup_all,
        EqualFilter, StringFilter,
    };

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn shipping_method_service_queries() {
        let (_, _, connection_manager, _) =
            setup_all("shipping_method_service_queries", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.shipping_method_service;

        let repo = ShippingMethodRowRepository::new(&context.connection);

        // Add shipping methods
        let shipping_method_1 = ShippingMethodRow {
            id: "test_shipping_method_1".to_string(),
            method: "Standard Delivery".to_string(),
            deleted_datetime: None,
        };

        let shipping_method_2 = ShippingMethodRow {
            id: "test_shipping_method_2".to_string(),
            method: "Express Delivery".to_string(),
            deleted_datetime: None,
        };

        let shipping_method_3 = ShippingMethodRow {
            id: "test_shipping_method_3".to_string(),
            method: "Overnight Shipping".to_string(),
            deleted_datetime: Some(chrono::Utc::now().naive_utc()),
        };

        repo.upsert_one(&shipping_method_1).unwrap();
        repo.upsert_one(&shipping_method_2).unwrap();
        repo.upsert_one(&shipping_method_3).unwrap();

        // Query all Shipping Methods that are active (not deleted)
        let result = service.get_shipping_methods(&context, None).unwrap();
        assert_eq!(result.count, 2);

        // Querying with ID filter
        let filter = ShippingMethodFilter {
            id: Some(EqualFilter::equal_to("test_shipping_method_1".to_string())),
            ..Default::default()
        };
        let result = service
            .get_shipping_methods(&context, Some(filter))
            .unwrap();
        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, "test_shipping_method_1");
        assert_eq!(result.rows[0].method, "Standard Delivery");

        // Querying with method filter
        let filter = ShippingMethodFilter {
            method: Some(StringFilter::like("Express")),
            ..Default::default()
        };
        let result = service
            .get_shipping_methods(&context, Some(filter))
            .unwrap();
        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].method, "Express Delivery");

        // Querying with non-existing ID filter
        let filter = ShippingMethodFilter {
            id: Some(EqualFilter::equal_to("non_existing_id".to_string())),
            ..Default::default()
        };
        let result = service
            .get_shipping_methods(&context, Some(filter))
            .unwrap();
        assert_eq!(result.count, 0);
        assert_eq!(result.rows.len(), 0);

        // Querying with partial method filter
        let filter = ShippingMethodFilter {
            method: Some(StringFilter::like("Delivery")),
            ..Default::default()
        };
        let result = service
            .get_shipping_methods(&context, Some(filter))
            .unwrap();
        assert_eq!(result.count, 2); // Both Standard and Express delivery
        assert_eq!(result.rows.len(), 2);
    }
}
