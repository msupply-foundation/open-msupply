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
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_patient, MockDataInserts},
        test_db::setup_all,
        CustomFieldValueFilter, DatetimeFilter, GeneralFilter, PrescriptionRequestCondition,
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
            ids(
                PrescriptionRequestFilter::new().dynamic_filter(
                    PrescriptionRequestCondition::CustomField::condition(
                        "prescription_request_occupation",
                        CustomFieldValueFilter::Text(GeneralFilter::Like("nurs".to_string())),
                    )
                )
            ),
            ["req_a"]
        );
    }

    /// The dispensed-datetime window: what a "dispensed in this period" count
    /// asks for. Windowed on the datetime alone — a request dispensed inside
    /// the window counts however it was created or prescribed, and one still
    /// awaiting the hand-over (null datetime) never counts.
    #[actix_rt::test]
    async fn dispensed_datetime_window() {
        let (_, connection, connection_manager, _) = setup_all(
            "prescription_request_dispensed_window",
            MockDataInserts::all(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();

        let datetime = |day: u32| {
            NaiveDate::from_ymd_opt(2026, 9, day)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap()
        };

        let row_repo = PrescriptionRequestRowRepository::new(&connection);
        for (id, number, status, dispensed_datetime) in [
            // Dispensed inside the window, prescribed well before it.
            (
                "in_window",
                11,
                PrescriptionRequestStatus::Dispensed,
                Some(datetime(9)),
            ),
            (
                "before_window",
                12,
                PrescriptionRequestStatus::Dispensed,
                Some(datetime(2)),
            ),
            (
                "after_window",
                13,
                PrescriptionRequestStatus::Dispensed,
                Some(datetime(20)),
            ),
            // Not dispensed at all — the null the window must exclude.
            (
                "not_dispensed",
                14,
                PrescriptionRequestStatus::ReadyToDispense,
                None,
            ),
        ] {
            row_repo
                .upsert_one(&PrescriptionRequestRow {
                    id: id.to_string(),
                    store_id: "store_a".to_string(),
                    prescription_request_number: number,
                    status,
                    created_by: "user_account_a".to_string(),
                    patient_id: mock_patient().id,
                    prescription_datetime: datetime(1),
                    dispensed_datetime,
                    ..Default::default()
                })
                .unwrap();
        }

        let window = PrescriptionRequestFilter::new()
            .dispensed_datetime(DatetimeFilter::date_range(datetime(7), datetime(13)));
        let result =
            get_prescription_requests(&ctx, Some("store_a"), None, Some(window), None).unwrap();

        assert_eq!(
            result
                .rows
                .into_iter()
                .map(|r| r.prescription_request_row.id)
                .collect::<Vec<_>>(),
            ["in_window"]
        );
        // The count backs the connector's totalCount, which is what a dashboard
        // figure reads: it must agree with the rows.
        assert_eq!(result.count, 1);
    }
}
