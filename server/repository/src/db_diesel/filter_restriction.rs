use crate::EqualFilter;

impl EqualFilter<String> {
    pub fn restrict_results(mut self, allowed: &[String]) -> Self {
        if let Some(equal_any) = &self.equal_any {
            self.equal_any = Some(
                equal_any
                    .iter()
                    .filter(|p| allowed.contains(p))
                    .cloned()
                    .collect(),
            )
        } else {
            self.equal_any = Some(allowed.to_owned())
        }

        self
    }
}

#[cfg(test)]
mod tests {
    use util::inline_init;

    use crate::{
        mock::{mock_name_a, MockData, MockDataInserts},
        test_db, EqualFilter, InvoiceFilter, InvoiceRepository, InvoiceRow,
    };

    fn mock_invoice_a() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "invoice1".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.user_id = Some("A".to_string());
        })
    }

    fn mock_invoice_b() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "invoice2".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.user_id = Some("B".to_string());
        })
    }

    fn mock_invoice_excluded() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "invoice3".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.user_id = Some("Excluded".to_string());
        })
    }

    fn mock_invoice_none() -> InvoiceRow {
        inline_init(|r: &mut InvoiceRow| {
            r.id = "invoice4".to_string();
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.user_id = None;
        })
    }

    #[actix_rt::test]
    async fn test_string_filter_restrict_results() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all_with_data(
            "test_string_filter_restrict_results",
            MockDataInserts::none()
                .names()
                .stores()
                .locations()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![
                    mock_invoice_a(),
                    mock_invoice_b(),
                    mock_invoice_excluded(),
                    mock_invoice_none(),
                ];
            }),
        )
        .await;
        let repository = InvoiceRepository::new(&mut storage_connection);

        let allowed = vec![
            mock_invoice_a().user_id.unwrap(),
            mock_invoice_b().user_id.unwrap(),
        ];
        let excluded_id = mock_invoice_excluded().user_id.unwrap();

        // test excluded entry is in the data set
        let result = repository
            .query_by_filter(InvoiceFilter::new().user_id(EqualFilter::equal_to(&excluded_id)))
            .unwrap();
        assert!(result.len() == 1);

        // no filter: return all allowed
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(EqualFilter::default().restrict_results(&allowed)),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert!(result.len() == 2);
        assert!(result.contains(&"A".to_string()));
        assert!(result.contains(&"B".to_string()));

        // equal_to: prevent query excluded id
        let result = repository
            .query_by_filter(
                InvoiceFilter::new()
                    .user_id(EqualFilter::equal_to(&excluded_id).restrict_results(&allowed)),
            )
            .unwrap();
        assert!(result.is_empty());
        // equal_to: allow query allowed id
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(EqualFilter::equal_to("A").restrict_results(&allowed)),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert_eq!(result, vec!["A".to_string()]);

        // equal_any
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(
                    EqualFilter::equal_any(vec!["A".to_string(), excluded_id.clone()])
                        .restrict_results(&allowed),
                ),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert_eq!(result, vec!["A".to_string()]);

        // equal_any_or_null: test null is included for default query
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(EqualFilter::equal_any_or_null(vec!["A".to_string()])),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.id)
            .collect::<Vec<_>>();
        assert!(result.len() == 2);
        assert!(result.contains(&mock_invoice_a().id));
        assert!(result.contains(&mock_invoice_none().id));
        // equal_any_or_null
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(
                    EqualFilter::equal_any_or_null(vec!["A".to_string(), excluded_id.clone()])
                        .restrict_results(&allowed),
                ),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert_eq!(result, vec!["A".to_string()]);

        // not_equal_to
        let result = repository
            .query_by_filter(
                InvoiceFilter::new()
                    .user_id(EqualFilter::not_equal_to("A").restrict_results(&allowed)),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert_eq!(result, vec!["B".to_string()]);

        // not_equal_all
        let result = repository
            .query_by_filter(InvoiceFilter::new().user_id(
                EqualFilter::not_equal_all(vec!["A".to_string()]).restrict_results(&allowed),
            ))
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert_eq!(result, vec!["B".to_string()]);

        // is_null
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(EqualFilter::is_null(true).restrict_results(&allowed)),
            )
            .unwrap()
            .into_iter()
            .map(|p| p.invoice_row.user_id.unwrap())
            .collect::<Vec<_>>();
        assert!(result.is_empty());

        // return empty list when allowed is empty
        let result = repository
            .query_by_filter(
                InvoiceFilter::new().user_id(EqualFilter::default().restrict_results(&[])),
            )
            .unwrap();
        assert!(result.is_empty());
    }
}
