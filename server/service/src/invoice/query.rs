use std::sync::LazyLock;

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::EqualFilter;
use repository::PaginationOption;
use repository::{
    invoice_count_cache, Invoice, InvoiceFilter, InvoiceRepository, InvoiceSort, RepositoryError,
};

/// Spike: how the invoice list computes totalCount, switched by the OMS_INVOICE_COUNT env var
/// so each option can be load-tested against the same build:
///   exact (default) — current behaviour, exact COUNT on every request
///   estimate        — InvoiceRepository::count_fast (Postgres planner estimate above 10k rows)
///   cache           — process-wide exact-count cache, cleared on any invoice write
#[derive(Clone, Copy, PartialEq, Debug)]
enum CountStrategy {
    Exact,
    Estimate,
    Cache,
}

fn count_strategy() -> CountStrategy {
    static STRATEGY: LazyLock<CountStrategy> =
        LazyLock::new(|| match std::env::var("OMS_INVOICE_COUNT").as_deref() {
            Ok("estimate") => CountStrategy::Estimate,
            Ok("cache") => CountStrategy::Cache,
            _ => CountStrategy::Exact,
        });
    *STRATEGY
}

fn count_with_strategy(
    repository: &InvoiceRepository,
    filter: InvoiceFilter,
) -> Result<i64, RepositoryError> {
    let filter = Some(filter);
    match count_strategy() {
        CountStrategy::Exact => repository.count(filter),
        CountStrategy::Estimate => repository.count_fast(filter),
        CountStrategy::Cache => {
            if let Some(count) = invoice_count_cache::get(&filter) {
                return Ok(count);
            }
            let count = repository.count(filter.clone())?;
            invoice_count_cache::insert(&filter, count);
            Ok(count)
        }
    }
}

pub fn get_invoices(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
) -> Result<ListResult<Invoice>, ListError> {
    get_invoices_with_options(ctx, store_id_option, pagination, filter, sort, true)
}

/// `include_count: false` skips the COUNT query entirely; the returned count is 0 and callers
/// must only pass false when the client did not select totalCount (so it is never serialized).
pub fn get_invoices_with_options(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
    include_count: bool,
) -> Result<ListResult<Invoice>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = InvoiceRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));
    // For invoice list we don't want to show any that are cancellation
    // reversals
    filter.is_cancellation = Some(false);

    let (offset, limit) = (pagination.offset as i64, pagination.limit as i64);
    let rows = repository.query(pagination, Some(filter.clone()), sort)?;
    let count = if include_count {
        let count = count_with_strategy(&repository, filter)?;
        i64_to_u32(clamp_count_to_page(count, offset, limit, rows.len() as i64))
    } else {
        0
    };

    Ok(ListResult { rows, count })
}

/// An estimated count can run low when table statistics are stale, and the UI derives its page
/// count from totalCount — a wrong-low count makes the trailing pages unreachable. The page
/// result itself is ground truth, so correct the count against it:
///   - a FULL page at an offset the count doesn't cover proves at least one more row exists
///     (count = offset + rows + 1, keeping the next page reachable);
///   - a non-empty SHORT page (or an empty first page) means the query ran past the end of the
///     data, so offset + rows IS the exact total (also snaps a wrong-high estimate to exact
///     when the user reaches the real last page).
/// An empty page at a non-zero offset proves nothing about the total (the offset may be far
/// past the end), so the strategy's count stands. For exact counts every branch is a no-op.
fn clamp_count_to_page(count: i64, offset: i64, limit: i64, rows_returned: i64) -> i64 {
    let observed = offset + rows_returned;
    if rows_returned == limit && count < observed {
        observed + 1
    } else if rows_returned < limit && (rows_returned > 0 || offset == 0) {
        observed
    } else {
        count
    }
}

#[cfg(test)]
mod clamp_test {
    use super::clamp_count_to_page;

    #[test]
    fn clamp_count_to_page_cases() {
        // (count, offset, limit, rows_returned) -> expected
        let cases = [
            // exact count, mid-list full page: untouched
            (1000, 0, 50, 50, 1000),
            // estimate too low, full page beyond it: bumped to keep paging open
            (40, 100, 50, 50, 151),
            // estimate too low, short page: snapped to the exact total
            (40, 100, 50, 35, 135),
            // estimate too high, short page (real last page): snapped down to exact
            (5000, 100, 50, 35, 135),
            // exact count, user on the genuinely-last full page: NOT bumped (no phantom row)
            (150, 100, 50, 50, 150),
            // empty first page: total is exactly zero
            (700, 0, 50, 0, 0),
            // empty page far past the end: proves nothing, estimate stands
            (700, 5000, 50, 0, 700),
        ];
        for (count, offset, limit, rows, expected) in cases {
            assert_eq!(
                clamp_count_to_page(count, offset, limit, rows),
                expected,
                "count={count} offset={offset} limit={limit} rows={rows}"
            );
        }
    }
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
        mock::{mock_unique_number_inbound_shipment, MockDataInserts},
        test_db::setup_all,
        InvoiceFilter,
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
