use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::EqualFilter;
use repository::PaginationOption;
use repository::{Invoice, InvoiceFilter, InvoiceRepository, InvoiceSort, RepositoryError};

pub fn get_invoices(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
) -> Result<ListResult<Invoice>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = InvoiceRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));
    // For invoice list we don't want to show any that are cancellation
    // reversals
    filter.is_cancellation = Some(false);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_invoice(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
    filter: Option<InvoiceFilter>,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut f = filter.unwrap_or_default();
    f.id = Some(EqualFilter::equal_to(id.to_string()));
    f.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));

    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(f)?;

    Ok(result.pop())
}

pub fn get_invoice_by_number(
    ctx: &ServiceContext,
    store_id: &str,
    invoice_number: u32,
    filter: InvoiceFilter,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut f = filter;
    f.invoice_number = Some(EqualFilter::equal_to(invoice_number as i64));
    // Reverse "cancellation" prescription will have the same Invoice
    // Number as their linked prescription, so we don't want to return
    // them
    f.is_cancellation = Some(false);
    f.store_id = Some(EqualFilter::equal_to(store_id.to_string()));

    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(f)?;

    Ok(result.pop())
}

#[cfg(test)]
mod test_query {
    use repository::{
        db_diesel::InvoiceType,
        mock::{
            mock_name_a, mock_store_a, mock_unique_number_inbound_shipment, MockData,
            MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceFilter, InvoiceRow, StringFilter,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn get_invoices_filter_by_name() {
        let (_, _, connection_manager, _) =
            setup_all("get_invoices_filter_by_name", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        // mock_name_store_a has name "Store A" and several outbound shipments
        // are linked to it. Sub-string match on "tore A" exercises the same
        // StringFilter::like path the e2e "Search by name" filter takes.
        let result = service
            .get_invoices(
                &context,
                None,
                None,
                Some(InvoiceFilter::new().name(StringFilter::like("tore A"))),
                None,
            )
            .unwrap();

        assert!(
            !result.rows.is_empty(),
            "Expected at least one invoice matching name 'tore A'"
        );
        for invoice in result.rows {
            assert!(
                invoice.other_party_name().to_lowercase().contains("tore a"),
                "Expected name to contain 'tore a', got '{}'",
                invoice.other_party_name()
            );
        }
    }

    #[actix_rt::test]
    async fn get_invoices_filter_by_their_reference() {
        // Existing mock outbound shipments all have empty their_reference, so
        // seed a dedicated invoice with a unique reference to filter against.
        fn invoice_with_reference() -> InvoiceRow {
            InvoiceRow {
                id: "filter_by_reference_target".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                their_reference: Some("UNIQUE-REF-XYZ".to_string()),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "get_invoices_filter_by_their_reference",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice_with_reference()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let result = service
            .get_invoices(
                &context,
                None,
                None,
                Some(InvoiceFilter::new().their_reference(StringFilter::like("UNIQUE-REF"))),
                None,
            )
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        assert_eq!(result.rows[0].invoice_row.id, invoice_with_reference().id);
    }

    #[actix_rt::test]
    async fn get_invoice_by_number() {
        let (_, _, connection_manager, _) =
            setup_all("get_invoice_by_number", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        // Not found
        assert_eq!(
            service.get_invoice_by_number(
                &context,
                "store_a",
                200,
                InvoiceFilter::new().r#type(InvoiceType::OutboundShipment.equal_to()),
            ),
            Ok(None)
        );

        let invoice_to_find = mock_unique_number_inbound_shipment();

        // Not found - wrong type
        assert_eq!(
            service.get_invoice_by_number(
                &context,
                "store_a",
                invoice_to_find.invoice_number as u32,
                InvoiceFilter::new().r#type(InvoiceType::OutboundShipment.equal_to()),
            ),
            Ok(None)
        );

        // Found
        let found_invoice = service
            .get_invoice_by_number(
                &context,
                "store_a",
                invoice_to_find.invoice_number as u32,
                InvoiceFilter::new().r#type(InvoiceType::InboundShipment.equal_to()),
            )
            .unwrap()
            .unwrap();

        assert_eq!(found_invoice.invoice_row.id, invoice_to_find.id);
    }
}
