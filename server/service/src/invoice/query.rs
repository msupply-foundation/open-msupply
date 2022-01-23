use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};
use domain::{
    invoice::{Invoice, InvoiceFilter, InvoiceSort, InvoiceType},
    EqualFilter, PaginationOption,
};
use repository::{InvoiceQueryRepository, RepositoryError, StorageConnectionManager};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_invoices(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
) -> Result<ListResult<Invoice>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = InvoiceQueryRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_invoice(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<Invoice, SingleRecordError> {
    let connection = connection_manager.connection()?;

    let mut result = InvoiceQueryRepository::new(&connection)
        .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

pub fn get_invoice_by_number(
    ctx: &ServiceContext,
    invoice_number: u32,
    r#type: InvoiceType,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut result = InvoiceQueryRepository::new(&ctx.connection).query_by_filter(
        InvoiceFilter::new()
            .invoice_number(EqualFilter {
                equal_to: Some(invoice_number as i64),
                not_equal_to: None,
                equal_any: None,
            })
            .r#type(r#type.equal_to()),
    )?;

    Ok(result.pop())
}

#[cfg(test)]
mod test_query {
    use domain::invoice::InvoiceType;
    use repository::{
        mock::{mock_unique_number_inbound_shipment, MockDataInserts},
        test_db::setup_all,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn get_invoice_by_number() {
        let (_, _, connection_manager, _) =
            setup_all("get_invoice_by_number", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // Not found
        assert_eq!(
            service.get_invoice_by_number(&context, 200, InvoiceType::OutboundShipment),
            Ok(None)
        );

        let invoice_to_find = mock_unique_number_inbound_shipment();

        // Not found - wrong type
        assert_eq!(
            service.get_invoice_by_number(
                &context,
                invoice_to_find.invoice_number as u32,
                InvoiceType::OutboundShipment,
            ),
            Ok(None)
        );

        // Found
        let found_invoice = service
            .get_invoice_by_number(
                &context,
                invoice_to_find.invoice_number as u32,
                InvoiceType::InboundShipment,
            )
            .unwrap()
            .unwrap();

        assert_eq!(found_invoice.id, invoice_to_find.id);
    }
}
