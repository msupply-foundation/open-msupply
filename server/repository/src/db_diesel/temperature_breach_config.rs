use super::{
    temperature_breach_config_row::{
        temperature_breach_config, temperature_breach_config::dsl as temperature_breach_config_dsl,
    },
    DBType, StorageConnection, TemperatureBreachConfigRow, TemperatureBreachRowType,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct TemperatureBreachConfig {
    pub temperature_breach_config_row: TemperatureBreachConfigRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct TemperatureBreachConfigFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<TemperatureBreachRowType>>,
    pub is_active: Option<bool>,
    pub store_id: Option<EqualFilter<String>>,
    pub description: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum TemperatureBreachConfigSortField {
    Id,
    Description,
}

pub type TemperatureBreachConfigSort = Sort<TemperatureBreachConfigSortField>;

pub struct TemperatureBreachConfigRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureBreachConfigRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureBreachConfigRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<TemperatureBreachConfigFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: TemperatureBreachConfigFilter,
    ) -> Result<Vec<TemperatureBreachConfig>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureBreachConfigFilter>,
        sort: Option<TemperatureBreachConfigSort>,
    ) -> Result<Vec<TemperatureBreachConfig>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                TemperatureBreachConfigSortField::Id => {
                    apply_sort_no_case!(query, sort, temperature_breach_config_dsl::id)
                }
                TemperatureBreachConfigSortField::Description => {
                    apply_sort_no_case!(query, sort, temperature_breach_config_dsl::description)
                }
            }
        } else {
            let sort = TemperatureBreachConfigSort {
                key: TemperatureBreachConfigSortField::Description,
                desc: Some(false),
            };
            apply_sort_no_case!(query, sort, temperature_breach_config_dsl::description)
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<TemperatureBreachConfigRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = temperature_breach_config::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<TemperatureBreachConfigFilter>) -> BoxedLogQuery {
    let mut query = temperature_breach_config::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, temperature_breach_config_dsl::id);
        apply_equal_filter!(query, filter.r#type, temperature_breach_config_dsl::type_);
        apply_equal_filter!(
            query,
            filter.description,
            temperature_breach_config_dsl::description
        );

        if let Some(value) = filter.is_active {
            query = query.filter(temperature_breach_config_dsl::is_active.eq(value));
        }

        apply_equal_filter!(
            query,
            filter.store_id,
            temperature_breach_config_dsl::store_id
        );
    }

    query
}

fn to_domain(temperature_breach_config_row: TemperatureBreachConfigRow) -> TemperatureBreachConfig {
    TemperatureBreachConfig {
        temperature_breach_config_row,
    }
}

impl TemperatureBreachConfigFilter {
    pub fn new() -> TemperatureBreachConfigFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<TemperatureBreachRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn description(mut self, filter: EqualFilter<String>) -> Self {
        self.description = Some(filter);
        self
    }
}
