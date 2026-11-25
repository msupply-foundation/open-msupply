use repository::{
    PaginationOption, Patient, PatientFilter, PatientRepository, PatientSort, RepositoryError,
};

use crate::{
    ListResult, get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext,
};

pub fn get_patients(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
    allowed_ctx: Option<&[String]>,
) -> Result<ListResult<Patient>, RepositoryError> {
    get_patients_with_count_limit(ctx, pagination, filter, sort, allowed_ctx, None)
}

/// As `get_patients`, but with `count_limit` set the count stops there (see
/// `PatientRepository::count_up_to`), and the page is sorted from only the
/// first `SEARCH_MATCH_CAP` matches found (`PatientRepository::query_capped`):
/// a search, where a broad term on a big central can match millions and
/// sorting them all is the slow part.
pub fn get_patients_with_count_limit(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
    allowed_ctx: Option<&[String]>,
    count_limit: Option<u32>,
) -> Result<ListResult<Patient>, RepositoryError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = PatientRepository::new(&ctx.connection);

    let (rows, count) = match count_limit {
        Some(limit) => (
            repository.query_capped(
                pagination,
                filter.clone(),
                sort,
                allowed_ctx,
                PatientRepository::SEARCH_MATCH_CAP,
            )?,
            // No more than the pages can reach
            repository.count_up_to(
                filter,
                allowed_ctx,
                limit.min(PatientRepository::SEARCH_MATCH_CAP),
            )?,
        ),
        None => (
            repository.query(pagination, filter.clone(), sort, allowed_ctx)?,
            repository.count(filter, allowed_ctx)?,
        ),
    };

    Ok(ListResult {
        rows,
        count: i64_to_u32(count),
    })
}

#[cfg(test)]
mod test {
    use repository::{
        NameRow, NameRowRepository, NameRowType, PaginationOption, PatientFilter,
        PatientRepository, PatientSort, PatientSortField, StringFilter, mock::MockDataInserts,
        test_db::setup_all,
    };

    use super::get_patients_with_count_limit;
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn count_limit_sorts_a_page_from_the_first_matches_only() {
        let (_, connection, connection_manager, _) = setup_all(
            "count_limit_sorts_a_page_from_the_first_matches_only",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let matches = PatientRepository::SEARCH_MATCH_CAP + 1;
        connection
            .transaction_sync(|connection| {
                let repo = NameRowRepository::new(connection);
                for i in 0..matches {
                    repo.upsert_one(&NameRow {
                        id: format!("capped_{i:04}"),
                        name: format!("Capped, {i:04}"),
                        code: format!("CAP-{i:04}"),
                        last_name: Some("Capped".to_string()),
                        r#type: NameRowType::Patient,
                        ..Default::default()
                    })?;
                }
                Ok::<_, repository::RepositoryError>(())
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let search = |count_limit: Option<u32>| {
            get_patients_with_count_limit(
                &ctx,
                Some(PaginationOption {
                    limit: Some(matches + 10),
                    offset: None,
                }),
                Some(PatientFilter::new().last_name(StringFilter::starts_with("capped"))),
                Some(PatientSort {
                    key: PatientSortField::Name,
                    desc: None,
                }),
                None,
                count_limit,
            )
            .unwrap()
        };

        // A search (count_limit set) sorts only the first matches found
        let searched = search(Some(1));
        assert_eq!(searched.count, 1);
        assert_eq!(
            searched.rows.len(),
            PatientRepository::SEARCH_MATCH_CAP as usize
        );
        let names: Vec<_> = searched.rows.iter().map(|p| p.name.clone()).collect();
        let mut sorted = names.clone();
        sorted.sort();
        assert_eq!(names, sorted);

        // The list (no count_limit) still has every match, counted
        let listed = search(None);
        assert_eq!(listed.count, matches);
        assert_eq!(listed.rows.len(), matches as usize);
    }
}
