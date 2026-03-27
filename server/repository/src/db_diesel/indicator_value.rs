use super::{
    indicator_value_row::{indicator_value, IndicatorValueRow},
    name_row::name,
    DBType, NameRow, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, repository_error::RepositoryError};

use crate::{EqualFilter, Pagination};

use diesel::{dsl::IntoBoxed, prelude::*};

pub struct IndicatorValueRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct IndicatorValueFilter {
    pub id: Option<EqualFilter<String>>,
    pub customer_name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub period_id: Option<EqualFilter<String>>,
    pub indicator_line_id: Option<EqualFilter<String>>,
    pub indicator_column_id: Option<EqualFilter<String>>,
}

#[derive(Debug)]
pub struct IndicatorValue {
    pub indicator_value_row: IndicatorValueRow,
    pub name_row: NameRow,
}

type IndicatorValueJoin = (IndicatorValueRow, NameRow);

impl IndicatorValueFilter {
    pub fn new() -> IndicatorValueFilter {
        Self::default()
    }
    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn customer_name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.customer_name_id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn period_id(mut self, filter: EqualFilter<String>) -> Self {
        self.period_id = Some(filter);
        self
    }
    pub fn indicator_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.indicator_line_id = Some(filter);
        self
    }
    pub fn indicator_column_id(mut self, filter: EqualFilter<String>) -> Self {
        self.indicator_column_id = Some(filter);
        self
    }
}

impl<'a> IndicatorValueRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorValueRepository { connection }
    }

    pub fn count(&self, filter: Option<IndicatorValueFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: IndicatorValueFilter,
    ) -> Result<Option<IndicatorValue>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: IndicatorValueFilter,
    ) -> Result<Vec<IndicatorValue>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn create_filtered_query(filter: Option<IndicatorValueFilter>) -> BoxedIndicatorQuery {
        let mut query = query().into_boxed();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, indicator_value::id);
            apply_equal_filter!(query, f.customer_name_id, indicator_value::customer_name_id);
            apply_equal_filter!(query, f.store_id, indicator_value::store_id);
            apply_equal_filter!(query, f.period_id, indicator_value::period_id);
            apply_equal_filter!(
                query,
                f.indicator_line_id,
                indicator_value::indicator_line_id
            );
            apply_equal_filter!(
                query,
                f.indicator_column_id,
                indicator_value::indicator_column_id
            );
        }

        query
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<IndicatorValueFilter>,
    ) -> Result<Vec<IndicatorValue>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<IndicatorValueJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((indicator_value_row, name_row): IndicatorValueJoin) -> IndicatorValue {
    IndicatorValue {
        indicator_value_row,
        name_row,
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    indicator_value::table.inner_join(name::table)
}

type BoxedIndicatorQuery = IntoBoxed<'static, query, DBType>;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        mock::{
            mock_indicator_column_a, mock_indicator_line_a, mock_indicator_value_a, mock_period,
            mock_period_2_a, mock_store_a, mock_store_b, mock_store_c, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        IndicatorValueRow, IndicatorValueRowRepository,
    };

    // Returns indicator values for store_b, period_2_a, customer=name_store_c (a second combination)
    fn indicator_value_b() -> IndicatorValueRow {
        IndicatorValueRow {
            id: "test_indicator_value_b".to_string(),
            store_id: mock_store_b().id,
            period_id: mock_period_2_a().id,
            indicator_line_id: mock_indicator_line_a().id,
            indicator_column_id: mock_indicator_column_a().id,
            value: "value_b".to_string(),
            customer_name_id: mock_store_c().name_id,
        }
    }

    // Returns indicator values for store_a, period_2_a, customer=name_store_b
    // (same store+customer as value_a but different period)
    fn indicator_value_c() -> IndicatorValueRow {
        IndicatorValueRow {
            id: "test_indicator_value_c".to_string(),
            store_id: mock_store_a().id,
            period_id: mock_period_2_a().id,
            indicator_line_id: mock_indicator_line_a().id,
            indicator_column_id: mock_indicator_column_a().id,
            value: "value_c".to_string(),
            customer_name_id: mock_store_b().name_id,
        }
    }

    #[actix_rt::test]
    async fn test_indicator_value_query_by_filter() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_indicator_value_query_by_filter",
            MockDataInserts::all(),
            MockData {
                indicator_values: vec![
                    mock_indicator_value_a(),
                    indicator_value_b(),
                    indicator_value_c(),
                ],
                ..Default::default()
            },
        )
        .await;

        let repo = IndicatorValueRepository::new(&connection);

        // 1. Single combination: exact match on period + store + customer
        let results = repo
            .query_by_filter(
                IndicatorValueFilter::new()
                    .store_id(EqualFilter::equal_to(mock_store_a().id))
                    .customer_name_id(EqualFilter::equal_to(mock_store_b().name_id))
                    .period_id(EqualFilter::equal_to(mock_period().id)),
            )
            .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(
            results[0].indicator_value_row.id,
            mock_indicator_value_a().id
        );

        // 2. Multiple period_ids via equal_any: should return values from both periods
        let results = repo
            .query_by_filter(
                IndicatorValueFilter::new()
                    .store_id(EqualFilter::equal_to(mock_store_a().id))
                    .customer_name_id(EqualFilter::equal_to(mock_store_b().name_id))
                    .period_id(EqualFilter::equal_any(vec![
                        mock_period().id,
                        mock_period_2_a().id,
                    ])),
            )
            .unwrap();
        assert_eq!(results.len(), 2);
        let mut ids: Vec<_> = results
            .iter()
            .map(|r| r.indicator_value_row.id.clone())
            .collect();
        ids.sort();
        assert!(ids.contains(&mock_indicator_value_a().id));
        assert!(ids.contains(&indicator_value_c().id));

        // 3. Multiple store + customer combinations via equal_any: mirrors the
        // IndicatorValueLoader batch query pattern where all unique period_ids,
        // store_ids, and customer_name_ids are gathered and queried in one IN-query.
        let results = repo
            .query_by_filter(
                IndicatorValueFilter::new()
                    .store_id(EqualFilter::equal_any(vec![
                        mock_store_a().id,
                        mock_store_b().id,
                    ]))
                    .customer_name_id(EqualFilter::equal_any(vec![
                        mock_store_b().name_id,
                        mock_store_c().name_id,
                    ]))
                    .period_id(EqualFilter::equal_any(vec![
                        mock_period().id,
                        mock_period_2_a().id,
                    ])),
            )
            .unwrap();
        // All three test values match the combined IN-query
        assert_eq!(results.len(), 3);

        // 4. No match: period exists but store+customer combination does not
        let results = repo
            .query_by_filter(
                IndicatorValueFilter::new()
                    .store_id(EqualFilter::equal_to(mock_store_a().id))
                    .customer_name_id(EqualFilter::equal_to(mock_store_c().name_id))
                    .period_id(EqualFilter::equal_to(mock_period().id)),
            )
            .unwrap();
        assert!(results.is_empty());
    }

    #[actix_rt::test]
    async fn test_indicator_value_query_empty_batch() {
        let (_, connection, _, _) = setup_all_with_data(
            "test_indicator_value_query_empty_batch",
            MockDataInserts::all(),
            MockData {
                indicator_values: vec![mock_indicator_value_a()],
                ..Default::default()
            },
        )
        .await;

        let repo = IndicatorValueRepository::new(&connection);
        let repo_row = IndicatorValueRowRepository::new(&connection);

        // Delete the one existing value so the table is empty for this query
        repo_row.delete(&mock_indicator_value_a().id).unwrap();

        let results = repo
            .query_by_filter(
                IndicatorValueFilter::new()
                    .store_id(EqualFilter::equal_to(mock_store_a().id))
                    .customer_name_id(EqualFilter::equal_to(mock_store_b().name_id))
                    .period_id(EqualFilter::equal_to(mock_period().id)),
            )
            .unwrap();
        assert!(results.is_empty());
    }
}
