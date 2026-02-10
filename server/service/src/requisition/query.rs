use repository::{
    requisition_row::RequisitionType, RepositoryError, Requisition, RequisitionFilter,
    RequisitionRepository, RequisitionSort,
};
use repository::{EqualFilter, PaginationOption};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_requisitions(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<RequisitionFilter>,
    sort: Option<RequisitionSort>,
) -> Result<ListResult<Requisition>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = RequisitionRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_requisition(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
) -> Result<Option<Requisition>, RepositoryError> {
    let mut filter = RequisitionFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id_option.map(|store_id| EqualFilter::equal_to(store_id.to_string()));

    let mut result = RequisitionRepository::new(&ctx.connection).query_by_filter(filter)?;

    Ok(result.pop())
}

pub fn get_requisition_by_number(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_number: u32,
    r#type: RequisitionType,
) -> Result<Option<Requisition>, RepositoryError> {
    let mut result = RequisitionRepository::new(&ctx.connection).query_by_filter(
        RequisitionFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .requisition_number(EqualFilter::equal_to(requisition_number as i64))
            .r#type(r#type.equal_to()),
    )?;

    Ok(result.pop())
}

#[cfg(test)]
mod test {
    use repository::EqualFilter;
    use repository::{
        mock::{
            mock_request_draft_requisition, mock_request_draft_requisition2,
            mock_requisition_for_number_test, MockDataInserts,
        },
        test_db::setup_all,
        RequisitionFilter,
    };

    use crate::{i64_to_u32, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn requisition_service_queries() {
        let (_, _, connection_manager, _) =
            setup_all("test_requisition_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.requisition_service;

        // Requisitions
        let result = service
            .get_requisitions(
                &context,
                Some(&mock_request_draft_requisition().store_id),
                None,
                Some(
                    RequisitionFilter::new()
                        .id(EqualFilter::equal_to(mock_request_draft_requisition().id)),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].requisition_row.id,
            mock_request_draft_requisition().id
        );

        // Requisition
        let result = service
            .get_requisition(
                &context,
                Some(&mock_request_draft_requisition2().store_id),
                &mock_request_draft_requisition2().id,
            )
            .unwrap()
            .unwrap();

        assert_eq!(
            result.requisition_row.id,
            mock_request_draft_requisition2().id
        );

        // Requisition by number
        let result = service
            .get_requisition_by_number(
                &context,
                &mock_requisition_for_number_test().store_id,
                i64_to_u32(mock_requisition_for_number_test().requisition_number),
                mock_requisition_for_number_test().r#type,
            )
            .unwrap()
            .unwrap();

        assert_eq!(
            result.requisition_row.id,
            mock_requisition_for_number_test().id
        );
    }
}
