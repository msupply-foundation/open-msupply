use repository::EqualFilter;
use repository::{
    RepositoryError, RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
};

use crate::{i64_to_u32, service_provider::ServiceContext, ListError, ListResult};

pub fn get_requisition_lines(
    ctx: &ServiceContext,
    filter: Option<RequisitionLineFilter>,
) -> Result<ListResult<RequisitionLine>, ListError> {
    let repository = RequisitionLineRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(filter.clone())?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_requisition_line(
    ctx: &ServiceContext,
    id: &str,
) -> Result<Option<RequisitionLine>, RepositoryError> {
    let mut result = RequisitionLineRepository::new(&ctx.connection)
        .query_by_filter(RequisitionLineFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(result.pop())
}

#[cfg(test)]
mod test {
    use repository::EqualFilter;
    use repository::{
        mock::{mock_draft_request_requisition_line, MockDataInserts},
        test_db::setup_all,
        RequisitionLineFilter,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn requisition_line_service_queries() {
        let (_, _, connection_manager, _) =
            setup_all("test_requisition_line_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLines
        let result = service
            .get_requisition_lines(
                &context,
                Some(
                    RequisitionLineFilter::new()
                        .id(EqualFilter::equal_to(
                            &mock_draft_request_requisition_line().id,
                        ))
                        .requisition_id(EqualFilter::equal_to(
                            &mock_draft_request_requisition_line().requisition_id,
                        )),
                ),
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].requisition_line_row.id,
            mock_draft_request_requisition_line().id
        );
    }
}
