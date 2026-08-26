use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, PrescriptionRequestFilter, PrescriptionRequestLine, PrescriptionRequestLineFilter,
    PrescriptionRequestLineRepository, PrescriptionRequestRepository, RepositoryError,
};

pub fn get_prescription_request_lines(
    ctx: &ServiceContext,
    store_id: &str,
    filter: PrescriptionRequestLineFilter,
) -> Result<Vec<PrescriptionRequestLine>, RepositoryError> {
    // Scope to this store via the parent requests (lines carry no store_id)
    let request_ids: Vec<String> = PrescriptionRequestRepository::new(&ctx.connection)
        .query_by_filter(
            PrescriptionRequestFilter::new().store_id(EqualFilter::equal_to(store_id.to_string())),
        )?
        .into_iter()
        .map(|request| request.prescription_request_row.id)
        .collect();

    let mut filter = filter;
    filter.prescription_request_id = Some(match filter.prescription_request_id {
        Some(existing) => existing,
        None => EqualFilter::equal_any(request_ids.clone()),
    });

    let lines = PrescriptionRequestLineRepository::new(&ctx.connection).query_by_filter(filter)?;

    // If the caller filtered to a specific request, still enforce the store scope
    Ok(lines
        .into_iter()
        .filter(|line| request_ids.contains(&line.prescription_request_line_row.prescription_request_id))
        .collect())
}
