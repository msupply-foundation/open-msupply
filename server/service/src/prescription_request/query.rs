use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, PrescriptionRequest, PrescriptionRequestFilter,
    PrescriptionRequestRepository, PrescriptionRequestSort, RepositoryError,
};

pub fn get_prescription_requests(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<PrescriptionRequestFilter>,
    sort: Option<PrescriptionRequestSort>,
) -> Result<ListResult<PrescriptionRequest>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = PrescriptionRequestRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_prescription_request(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    id: &str,
) -> Result<Option<PrescriptionRequest>, RepositoryError> {
    let repository = PrescriptionRequestRepository::new(&ctx.connection);
    let mut filter = PrescriptionRequestFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_patient, MockDataInserts},
        test_db::setup_all,
        CustomFieldValueFilter, GeneralFilter, PrescriptionRequestCondition,
        PrescriptionRequestRow, PrescriptionRequestRowRepository, PrescriptionRequestStatus,
        StringFilter,
    };
    use serde_json::json;

    use super::*;
    use crate::service_provider::ServiceProvider;

    /// The list's two non-column filters: the prescriber (matched on the
    /// creating account's username, through the user_account sub-select) and
    /// the custom-field condition AST.
    #[actix_rt::test]
    async fn prescriber_and_custom_field_filters() {
        let (_, connection, connection_manager, _) =
            setup_all("prescription_request_list_filters", MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();

        // Written directly: the update mutation validates custom-field keys
        // against the scope's configured set, and this test is about the read.
        let row_repo = PrescriptionRequestRowRepository::new(&connection);
        for (id, created_by, number, occupation) in [
            ("req_a", "user_account_a", 1, "nurse"),
            ("req_b", "user_account_b", 2, "teacher"),
        ] {
            row_repo
                .upsert_one(&PrescriptionRequestRow {
                    id: id.to_string(),
                    store_id: "store_a".to_string(),
                    prescription_request_number: number,
                    status: PrescriptionRequestStatus::New,
                    created_by: created_by.to_string(),
                    patient_id: mock_patient().id,
                    custom_fields: Some(
                        json!({ "prescription_request_occupation": occupation }).into(),
                    ),
                    ..Default::default()
                })
                .unwrap();
        }

        let ids = |filter: PrescriptionRequestFilter| {
            get_prescription_requests(&ctx, Some("store_a"), None, Some(filter), None)
                .unwrap()
                .rows
                .into_iter()
                .map(|r| r.prescription_request_row.id)
                .collect::<Vec<_>>()
        };

        // Contains-match on the username, not the user id.
        assert_eq!(
            ids(PrescriptionRequestFilter::new().username(StringFilter::like("name_b"))),
            ["req_b"]
        );
        assert!(
            ids(PrescriptionRequestFilter::new()
                .username(StringFilter::equal_to("user_account_a")))
            .is_empty(),
            "the filter matches the username, never the account id"
        );

        assert_eq!(
            ids(PrescriptionRequestFilter::new().dynamic_filter(
                PrescriptionRequestCondition::CustomField::condition(
                    "prescription_request_occupation",
                    CustomFieldValueFilter::Text(GeneralFilter::Like("nurs".to_string())),
                )
            )),
            ["req_a"]
        );
    }
}
