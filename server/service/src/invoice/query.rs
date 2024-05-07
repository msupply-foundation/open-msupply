use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{EqualFilter, PaginationOption};
use repository::{
    Invoice, InvoiceFilter, InvoiceRepository, InvoiceSort, InvoiceType, RepositoryError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_invoices(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
) -> Result<ListResult<Invoice>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = InvoiceRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id_option.map(EqualFilter::equal_to);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_invoice(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut filter = InvoiceFilter::new().id(EqualFilter::equal_to(id));
    filter.store_id = store_id_option.map(EqualFilter::equal_to);

    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(filter)?;

    Ok(result.pop())
}

pub fn get_invoice_by_number(
    ctx: &ServiceContext,
    store_id: &str,
    invoice_number: u32,
    r#type: InvoiceType,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(
        InvoiceFilter::new()
            .invoice_number(EqualFilter::equal_to_i64(invoice_number as i64))
            .store_id(EqualFilter::equal_to(store_id))
            .r#type(r#type.equal_to()),
    )?;

    Ok(result.pop())
}

#[cfg(test)]
mod test_query {
    use repository::{
        db_diesel::InvoiceType,
        mock::{mock_unique_number_inbound_shipment, MockDataInserts},
        test_db::setup_all,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn get_invoice_by_number() {
        let (_, _, connection_manager, _) =
            setup_all("get_invoice_by_number", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        // Not found
        assert_eq!(
            service.get_invoice_by_number(&context, "store_a", 200, InvoiceType::OutboundShipment),
            Ok(None)
        );

        let invoice_to_find = mock_unique_number_inbound_shipment();

        // Not found - wrong type
        assert_eq!(
            service.get_invoice_by_number(
                &context,
                "store_a",
                invoice_to_find.invoice_number as u32,
                InvoiceType::OutboundShipment,
            ),
            Ok(None)
        );

        // Found
        let found_invoice = service
            .get_invoice_by_number(
                &context,
                "store_a",
                invoice_to_find.invoice_number as u32,
                InvoiceType::InboundShipment,
            )
            .unwrap()
            .unwrap();

        assert_eq!(found_invoice.invoice_row.id, invoice_to_find.id);
    }
}
