use super::asset_row::{asset, AssetRow};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    asset_log_row::{latest_asset_log, AssetLogRow, AssetLogStatus},
    db_diesel::{name_link_row::name_link, name_row::name, store_row::store},
    diesel_macros::{
        apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter,
        apply_string_or_filter,
    },
    repository_error::RepositoryError,
    DBType, DateFilter, EqualFilter, Pagination, Sort, StorageConnection, StoreRow, StringFilter,
};

pub type Asset = AssetRow;

type AssetJoin = (AssetRow, Option<StoreRow>, Option<AssetLogRow>);

pub enum AssetSortField {
    SerialNumber,
    InstallationDate,
    ReplacementDate,
    ModifiedDatetime,
    Notes,
    AssetNumber,
    Store,
}

pub type AssetSort = Sort<AssetSortField>;

#[derive(Clone, Default)]
pub struct AssetFilter {
    pub id: Option<EqualFilter<String>>,
    pub notes: Option<StringFilter>,
    pub asset_number: Option<StringFilter>,
    pub serial_number: Option<StringFilter>,
    pub class_id: Option<EqualFilter<String>>,
    pub category_id: Option<EqualFilter<String>>,
    pub type_id: Option<EqualFilter<String>>,
    pub catalogue_item_id: Option<EqualFilter<String>>,
    pub installation_date: Option<DateFilter>,
    pub replacement_date: Option<DateFilter>,
    pub is_non_catalogue: Option<bool>,
    pub store: Option<StringFilter>,
    pub functional_status: Option<EqualFilter<AssetLogStatus>>,
}

impl AssetFilter {
    pub fn new() -> AssetFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn notes(mut self, filter: StringFilter) -> Self {
        self.notes = Some(filter);
        self
    }

    pub fn asset_number(mut self, filter: StringFilter) -> Self {
        self.asset_number = Some(filter);
        self
    }

    pub fn serial_number(mut self, filter: StringFilter) -> Self {
        self.serial_number = Some(filter);
        self
    }

    pub fn class_id(mut self, filter: EqualFilter<String>) -> Self {
        self.class_id = Some(filter);
        self
    }

    pub fn category_id(mut self, filter: EqualFilter<String>) -> Self {
        self.category_id = Some(filter);
        self
    }

    pub fn type_id(mut self, filter: EqualFilter<String>) -> Self {
        self.type_id = Some(filter);
        self
    }

    pub fn catalogue_item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.catalogue_item_id = Some(filter);
        self
    }

    pub fn installation_date(mut self, filter: DateFilter) -> Self {
        self.installation_date = Some(filter);
        self
    }

    pub fn replacement_date(mut self, filter: DateFilter) -> Self {
        self.replacement_date = Some(filter);
        self
    }

    pub fn is_non_catalogue(mut self, filter: bool) -> Self {
        self.is_non_catalogue = Some(filter);
        self
    }

    pub fn store(mut self, filter: StringFilter) -> Self {
        self.store = Some(filter);
        self
    }
}

pub struct AssetRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(&self, filter: AssetFilter) -> Result<Option<Asset>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(&self, filter: AssetFilter) -> Result<Vec<Asset>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetFilter>,
        sort: Option<AssetSort>,
    ) -> Result<Vec<Asset>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetSortField::SerialNumber => {
                    apply_sort_no_case!(query, sort, asset::serial_number);
                }
                AssetSortField::InstallationDate => {
                    apply_sort!(query, sort, asset::installation_date)
                }
                AssetSortField::ReplacementDate => {
                    apply_sort!(query, sort, asset::replacement_date)
                }
                AssetSortField::ModifiedDatetime => {
                    apply_sort!(query, sort, asset::modified_datetime)
                }
                AssetSortField::Notes => {
                    apply_sort!(query, sort, asset::notes)
                }
                AssetSortField::AssetNumber => {
                    apply_sort_no_case!(query, sort, asset::asset_number)
                }
                AssetSortField::Store => {
                    apply_sort_no_case!(query, sort, store::code)
                }
            }
        } else {
            query = query.order(asset::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((asset_row, _, _): AssetJoin) -> Asset {
    asset_row
}

type BoxedAssetQuery = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<asset::table, store::table>, latest_asset_log::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<AssetFilter>) -> BoxedAssetQuery {
    let mut query = asset::table
        .left_join(store::table)
        .left_join(latest_asset_log::table)
        .into_boxed();

    query = query.filter(asset::deleted_datetime.is_null()); // Don't include any deleted items

    if let Some(f) = filter {
        let AssetFilter {
            id,
            notes,
            asset_number,
            serial_number,
            class_id,
            category_id,
            type_id,
            catalogue_item_id,
            installation_date,
            replacement_date,
            is_non_catalogue,
            store,
            functional_status,
        } = f;

        apply_equal_filter!(query, id, asset::id);
        apply_string_filter!(query, notes, asset::notes);
        apply_string_filter!(query, asset_number, asset::asset_number);
        apply_string_filter!(query, serial_number, asset::serial_number);

        apply_equal_filter!(query, catalogue_item_id, asset::asset_catalogue_item_id);
        apply_date_filter!(query, installation_date, asset::installation_date);
        apply_date_filter!(query, replacement_date, asset::replacement_date);

        apply_equal_filter!(query, category_id, asset::asset_category_id);
        apply_equal_filter!(query, class_id, asset::asset_class_id);
        apply_equal_filter!(query, type_id, asset::asset_catalogue_type_id);

        if let Some(value) = is_non_catalogue {
            apply_equal_filter!(
                query,
                Some(EqualFilter::is_null(value)),
                asset::asset_catalogue_item_id
            );
        }

        if store.is_some() {
            let mut sub_query = store::table
                .select(store::id)
                .left_join(name_link::table.inner_join(name::table))
                .into_boxed();
            apply_string_filter!(sub_query, store.clone(), store::code);
            apply_string_or_filter!(sub_query, store, name::name_);
            query = query.filter(asset::store_id.eq_any(sub_query.nullable()));
        }

        if functional_status.is_some() {
            let mut sub_query = latest_asset_log::table
                .select(latest_asset_log::asset_id)
                .into_boxed();
            apply_equal_filter!(sub_query, functional_status, latest_asset_log::status);
            query = query.filter(asset::id.eq_any(sub_query));
        }
    }

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        assets::{
            asset::AssetRepository,
            asset_row::{AssetRow, AssetRowRepository},
        },
        mock::{mock_store_a, MockDataInserts},
        test_db, EqualFilter,
    };

    use super::AssetFilter;

    #[actix_rt::test]
    async fn test_asset_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_asset_query_repository",
            MockDataInserts::none().stores(),
        )
        .await;

        // Create an asset without catalogue item
        let asset_id = "test_asset_id".to_string();
        let serial_number = "test_serial_number".to_string();
        let asset = AssetRow {
            id: asset_id.clone(),
            notes: Some("test_note".to_string()),
            store_id: Some(mock_store_a().id),
            serial_number: Some(serial_number.clone()),
            ..Default::default()
        };

        let _result = AssetRowRepository::new(&storage_connection)
            .upsert_one(&asset)
            .unwrap();

        // Query by id
        let result = AssetRepository::new(&storage_connection)
            .query_one(AssetFilter::new().id(EqualFilter::equal_to(&asset_id)))
            .unwrap()
            .unwrap();
        assert_eq!(result.id, asset_id);
        assert_eq!(result.serial_number, Some(serial_number));
    }
}
