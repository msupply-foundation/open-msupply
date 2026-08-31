use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, PrescriptionRequestLine, PrescriptionRequestLineFilter,
    PrescriptionRequestLineRepository, RepositoryError,
};

/// Lines are always scoped to the calling store through their parent request —
/// they hold no store of their own, and the filter joins rather than fetching
/// the store's requests first. The scope is applied here rather than taken from
/// the caller's filter, so a `prescription_request_id` naming another store's
/// request returns nothing instead of that store's lines.
pub fn get_prescription_request_lines(
    ctx: &ServiceContext,
    store_id: &str,
    filter: PrescriptionRequestLineFilter,
) -> Result<Vec<PrescriptionRequestLine>, RepositoryError> {
    let filter = PrescriptionRequestLineFilter {
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
        ..filter
    };

    PrescriptionRequestLineRepository::new(&ctx.connection).query_by_filter(filter)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_patient, MockDataInserts},
        test_db::setup_all,
        PrescriptionRequestLineFilter,
    };
    use util::uuid::uuid;

    use crate::prescription_request::insert::InsertPrescriptionRequest;
    use crate::prescription_request_line::upsert::UpsertPrescriptionRequestLine;
    use crate::service_provider::ServiceProvider;

    use super::*;

    /// A request in store_b, asked for from store_a, answers with nothing —
    /// naming the request id directly must not reach across the store boundary.
    #[actix_rt::test]
    async fn get_prescription_request_lines_is_scoped_to_the_store() {
        let (_, _, connection_manager, _) = setup_all(
            "get_prescription_request_lines_is_scoped_to_the_store",
            MockDataInserts::all(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context("store_b".to_string(), "user_account_a".to_string())
            .unwrap();

        let request = service_provider
            .prescription_request_service
            .insert_prescription_request(
                &ctx,
                "store_b",
                InsertPrescriptionRequest {
                    id: uuid(),
                    patient_id: mock_patient().id,
                    ..Default::default()
                },
            )
            .unwrap();
        service_provider
            .prescription_request_line_service
            .upsert_prescription_request_line(
                &ctx,
                "store_b",
                UpsertPrescriptionRequestLine {
                    id: uuid(),
                    prescription_request_id: request.id.clone(),
                    item_id: mock_item_a().id,
                    number_of_units: 5.0,
                    note: None,
                },
            )
            .unwrap();

        let by_request = PrescriptionRequestLineFilter::new()
            .prescription_request_id(EqualFilter::equal_to(request.id.clone()));

        // The owning store sees it
        assert_eq!(
            get_prescription_request_lines(&ctx, "store_b", by_request.clone())
                .unwrap()
                .len(),
            1
        );
        // Another store, naming the same request id, does not
        assert_eq!(
            get_prescription_request_lines(&ctx, "store_a", by_request)
                .unwrap()
                .len(),
            0
        );
        // ...and neither does an unfiltered fetch from that store
        assert!(get_prescription_request_lines(
            &ctx,
            "store_a",
            PrescriptionRequestLineFilter::new()
        )
        .unwrap()
        .iter()
        .all(|line| line.prescription_request_line_row.prescription_request_id != request.id));
    }
}
