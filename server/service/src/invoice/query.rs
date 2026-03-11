use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, Pagination, PaginationOption, PermissionType, UserPermissionFilter,
    UserPermissionRepository,
};
use repository::{
    Invoice, InvoiceFilter, InvoiceRepository, InvoiceSort, InvoiceType, RepositoryError,
};

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

#[derive(Debug, PartialEq)]
pub enum GetInvoiceError {
    AuthorisationDenied,
    RecordNotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for GetInvoiceError {
    fn from(error: RepositoryError) -> Self {
        GetInvoiceError::DatabaseError(error)
    }
}

/// Determine the query permission required for a given invoice
fn query_permission_for_invoice(invoice: &Invoice) -> PermissionType {
    match invoice.invoice_row.r#type {
        InvoiceType::OutboundShipment => PermissionType::OutboundShipmentQuery,
        InvoiceType::InboundShipment => {
            if invoice.invoice_row.purchase_order_id.is_some() {
                PermissionType::InboundShipmentExternalQuery
            } else {
                PermissionType::InboundShipmentQuery
            }
        }
        InvoiceType::Prescription => PermissionType::PrescriptionQuery,
        InvoiceType::SupplierReturn => PermissionType::SupplierReturnQuery,
        InvoiceType::CustomerReturn => PermissionType::CustomerReturnQuery,
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction | InvoiceType::Repack => {
            PermissionType::StocktakeQuery
        }
    }
}

fn check_invoice_query_permission(
    ctx: &ServiceContext,
    invoice: &Invoice,
) -> Result<(), GetInvoiceError> {
    // System operations (e.g. transfer processors) run without a user context
    if ctx.user_id.is_empty() {
        return Ok(());
    }

    let required_permission = query_permission_for_invoice(invoice);

    let user_permissions = UserPermissionRepository::new(&ctx.connection).query(
        Pagination::all(),
        Some(
            UserPermissionFilter::new()
                .user_id(EqualFilter::equal_to(ctx.user_id.clone()))
                .store_id(EqualFilter::equal_to(ctx.store_id.clone())),
        ),
        None,
    )?;

    if user_permissions
        .iter()
        .any(|p| p.permission == required_permission)
    {
        Ok(())
    } else {
        Err(GetInvoiceError::AuthorisationDenied)
    }
}

/// Get an invoice by ID (no permission check - for internal use)
pub fn get_invoice(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut filter = InvoiceFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));

    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(filter)?;

    Ok(result.pop())
}

/// Get an invoice by ID with permission check based on invoice type
pub fn get_invoice_authorized(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
) -> Result<Invoice, GetInvoiceError> {
    let invoice = get_invoice(ctx, store_id_option, id)?
        .ok_or(GetInvoiceError::RecordNotFound)?;

    check_invoice_query_permission(ctx, &invoice)?;

    Ok(invoice)
}

/// Get an invoice by number (no permission check - for internal use)
pub fn get_invoice_by_number(
    ctx: &ServiceContext,
    store_id: &str,
    invoice_number: u32,
    r#type: InvoiceType,
) -> Result<Option<Invoice>, RepositoryError> {
    let mut result = InvoiceRepository::new(&ctx.connection).query_by_filter(
        InvoiceFilter::new()
            .invoice_number(EqualFilter::equal_to(invoice_number as i64))
            // Reverse "cancellation" prescription will have the same Invoice
            // Number as their linked prescription, so we don't want to return
            // them
            .is_cancellation(false)
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .r#type(r#type.equal_to()),
    )?;

    Ok(result.pop())
}

/// Get an invoice by number with permission check based on invoice type
pub fn get_invoice_by_number_authorized(
    ctx: &ServiceContext,
    store_id: &str,
    invoice_number: u32,
    r#type: InvoiceType,
) -> Result<Invoice, GetInvoiceError> {
    let invoice = get_invoice_by_number(ctx, store_id, invoice_number, r#type)?
        .ok_or(GetInvoiceError::RecordNotFound)?;

    check_invoice_query_permission(ctx, &invoice)?;

    Ok(invoice)
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

        let service_provider = ServiceProvider::new(connection_manager);
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
