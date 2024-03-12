use crate::{
    asset_internal_location_row::{asset_internal_location, AssetInternalLocationRow},
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    DBType, EqualFilter, Pagination, RepositoryError, Sort, StorageConnection,
};

use super::asset_internal_location_row::asset_internal_location::dsl as asset_internal_location_dsl;

use diesel::{dsl::IntoBoxed, prelude::*};

pub type AssetInternalLocation = AssetInternalLocationRow;

pub enum AssetInternalLocationSortField {
    AssetId,
}

pub type AssetInternalLocationSort = Sort<AssetInternalLocationSortField>;

#[derive(Clone)]
pub struct AssetInternalLocationFilter {
    pub id: Option<EqualFilter<String>>,
    pub asset_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
}

impl AssetInternalLocationFilter {
    pub fn new() -> AssetInternalLocationFilter {
        AssetInternalLocationFilter {
            id: None,
            asset_id: None,
            location_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn asset_id(mut self, filter: EqualFilter<String>) -> Self {
        self.asset_id = Some(filter);
        self
    }
    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }
}

pub struct AssetInternalLocationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetInternalLocationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetInternalLocationRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<AssetInternalLocationFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_one(
        &self,
        filter: AssetInternalLocationFilter,
    ) -> Result<Option<AssetInternalLocationRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetInternalLocationFilter,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetInternalLocationFilter>,
        sort: Option<AssetInternalLocationSort>,
    ) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                AssetInternalLocationSortField::AssetId => {
                    apply_sort_no_case!(query, sort, asset_internal_location_dsl::asset_id)
                }
            }
        } else {
            query = query.order(asset_internal_location_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetInternalLocationRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_internal_location_row: AssetInternalLocationRow) -> AssetInternalLocationRow {
    asset_internal_location_row
}

type BoxedAssetInternalLocationQuery = IntoBoxed<'static, asset_internal_location::table, DBType>;

fn create_filtered_query(
    filter: Option<AssetInternalLocationFilter>,
) -> BoxedAssetInternalLocationQuery {
    let mut query = asset_internal_location_dsl::asset_internal_location.into_boxed();

    if let Some(f) = filter {
        let AssetInternalLocationFilter {
            id,
            asset_id,
            location_id,
        } = f;

        apply_equal_filter!(query, id, asset_internal_location_dsl::id);
        apply_equal_filter!(query, asset_id, asset_internal_location_dsl::asset_id);
        apply_equal_filter!(query, location_id, asset_internal_location_dsl::location_id);
    }
    query
}
