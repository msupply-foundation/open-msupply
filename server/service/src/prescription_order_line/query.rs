use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, PrescriptionOrderFilter, PrescriptionOrderLine, PrescriptionOrderLineFilter,
    PrescriptionOrderLineRepository, PrescriptionOrderRepository, RepositoryError,
};

pub fn get_prescription_order_lines(
    ctx: &ServiceContext,
    store_id: &str,
    filter: PrescriptionOrderLineFilter,
) -> Result<Vec<PrescriptionOrderLine>, RepositoryError> {
    // Scope to this store via the parent orders (lines carry no store_id)
    let order_ids: Vec<String> = PrescriptionOrderRepository::new(&ctx.connection)
        .query_by_filter(
            PrescriptionOrderFilter::new().store_id(EqualFilter::equal_to(store_id.to_string())),
        )?
        .into_iter()
        .map(|order| order.prescription_order_row.id)
        .collect();

    let mut filter = filter;
    filter.prescription_order_id = Some(match filter.prescription_order_id {
        Some(existing) => existing,
        None => EqualFilter::equal_any(order_ids.clone()),
    });

    let lines = PrescriptionOrderLineRepository::new(&ctx.connection).query_by_filter(filter)?;

    // If the caller filtered to a specific order, still enforce the store scope
    Ok(lines
        .into_iter()
        .filter(|line| order_ids.contains(&line.prescription_order_line_row.prescription_order_id))
        .collect())
}
