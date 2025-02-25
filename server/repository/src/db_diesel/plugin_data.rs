use super::{plugin_data_row::plugin_data, StorageConnection};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    DBType, EqualFilter, Pagination, PluginDataRow, RepositoryError, Sort,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq)]
pub struct PluginData {
    pub plugin_data: PluginDataRow,
}

#[derive(Clone, PartialEq, Debug, Default, TS, Serialize, Deserialize)]
pub struct PluginDataFilter {
    #[ts(optional)]
    pub id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub plugin_code: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub related_record_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub data_identifier: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum PluginDataSortField {
    Id,
    PluginCode,
}

pub type PluginDataSort = Sort<PluginDataSortField>;

pub struct PluginDataRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PluginDataRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PluginDataRepository { connection }
    }

    pub fn count(&self, filter: Option<PluginDataFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PluginDataFilter,
    ) -> Result<Vec<PluginData>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PluginDataFilter>,
        sort: Option<PluginDataSort>,
    ) -> Result<Vec<PluginData>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                PluginDataSortField::Id => {
                    apply_sort_no_case!(query, sort, plugin_data::id);
                }
                PluginDataSortField::PluginCode => {
                    apply_sort_no_case!(query, sort, plugin_data::plugin_code);
                }
            }
        } else {
            query = query.order(plugin_data::plugin_code.asc());
        }

        let results = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PluginDataRow>(self.connection.lock().connection())?;

        Ok(results.into_iter().map(to_domain).collect())
    }
}

type BoxedPluginQuery = plugin_data::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<PluginDataFilter>) -> BoxedPluginQuery {
    let mut query = plugin_data::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, plugin_data::id);
        apply_equal_filter!(query, filter.plugin_code, plugin_data::plugin_code);
        apply_equal_filter!(
            query,
            filter.related_record_id,
            plugin_data::related_record_id
        );
        apply_equal_filter!(query, filter.data_identifier, plugin_data::data_identifier);
        apply_equal_filter!(query, filter.store_id, plugin_data::store_id);
    }

    query
}

fn to_domain(plugin_data_row: PluginDataRow) -> PluginData {
    PluginData {
        plugin_data: plugin_data_row,
    }
}

impl PluginDataFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn plugin_name(mut self, filter: EqualFilter<String>) -> Self {
        self.plugin_code = Some(filter);
        self
    }

    pub fn related_record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.related_record_id = Some(filter);
        self
    }

    pub fn data_identifier(mut self, filter: EqualFilter<String>) -> Self {
        self.data_identifier = Some(filter);
        self
    }
}
