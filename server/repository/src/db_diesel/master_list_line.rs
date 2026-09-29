use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    item_store_join::item_store_join,
    repository_error::RepositoryError,
    EqualFilter, ItemRow, ItemType, MasterListRepository, Pagination, Sort,
};

use super::{
    item_row::item, master_list_line_row::master_list_line, master_list_row::master_list, DBType,
    MasterListFilter, MasterListLineRow, StorageConnection,
};

use diesel::{helper_types::IntoBoxed, prelude::*};

#[derive(Clone, Debug, PartialEq)]
pub struct MasterListLine {
    pub id: String,
    pub item_id: String,
    pub master_list_id: String,
    pub price_per_unit: Option<f64>,
}

type MasterListLineJoin = (MasterListLineRow, ItemRow);

#[derive(Clone, Debug, PartialEq, Default)]
pub struct MasterListLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub master_list_id: Option<EqualFilter<String>>,
    pub item_type: Option<EqualFilter<ItemType>>,
    pub master_list: Option<MasterListFilter>,
    pub ignore_for_orders: Option<bool>,
}

pub enum MasterListLineSortField {
    Name,
    Code,
}

pub type MasterListLineSort = Sort<MasterListLineSortField>;

pub struct MasterListLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRepository { connection }
    }

    pub fn count(&self, filter: Option<MasterListLineFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = Self::create_filtered_query(filter, None)?;

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: MasterListLineFilter,
        store_id: Option<String>,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = Self::create_filtered_query(Some(filter), store_id)?;

        query = query.order(master_list_line::id.asc());

        let result = query.load::<MasterListLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MasterListLineFilter>,
        sort: Option<MasterListLineSort>,
        store_id: Option<String>,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = Self::create_filtered_query(filter, store_id)?;

        if let Some(sort) = sort {
            match sort.key {
                MasterListLineSortField::Name => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                MasterListLineSortField::Code => {
                    apply_sort_no_case!(query, sort, item::code);
                }
            }
        } else {
            query = query.order(master_list_line::id.asc())
        }

        let result = query
            // Stable tiebreaker so paginated results don't shuffle or drop rows
            // when the primary sort column has ties.
            .then_order_by(master_list_line::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<MasterListLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<MasterListLineFilter>,
        store_id: Option<String>,
    ) -> Result<BoxedMasterListLineQuery, RepositoryError> {
        let mut query = query().into_boxed();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, master_list_line::id);
            apply_equal_filter!(query, f.item_id, item::id);
            apply_equal_filter!(query, f.master_list_id, master_list_line::master_list_id);
            apply_equal_filter!(query, f.item_type, item::type_);

            if f.master_list.is_some() {
                let master_list_ids = MasterListRepository::create_filtered_query(f.master_list)
                    .select(master_list::id);

                query = query.filter(master_list_line::master_list_id.eq_any(master_list_ids));
            }

            // `false` excludes the barred items; an item with no join row is orderable.
            if let Some(ignore_for_orders) = f.ignore_for_orders {
                let mut ignored_item_ids = item_store_join::table
                    .select(item_store_join::item_id)
                    .filter(item_store_join::ignore_for_orders.eq(true))
                    .into_boxed();

                if let Some(store_id) = store_id {
                    ignored_item_ids =
                        ignored_item_ids.filter(item_store_join::store_id.eq(store_id));
                }

                query = if ignore_for_orders {
                    query.filter(master_list_line::item_id.eq_any(ignored_item_ids))
                } else {
                    query.filter(master_list_line::item_id.ne_all(ignored_item_ids))
                };
            }
        }

        Ok(query)
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    master_list_line::table.inner_join(item::table)
}

type BoxedMasterListLineQuery = IntoBoxed<'static, query, DBType>;

fn to_domain((master_list_line_row, item_row): MasterListLineJoin) -> MasterListLine {
    MasterListLine {
        id: master_list_line_row.id,
        master_list_id: master_list_line_row.master_list_id,
        item_id: item_row.id,
        price_per_unit: master_list_line_row.price_per_unit,
    }
}

impl MasterListLineFilter {
    pub fn new() -> MasterListLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn master_list_id(mut self, filter: EqualFilter<String>) -> Self {
        self.master_list_id = Some(filter);
        self
    }

    pub fn item_type(mut self, filter: EqualFilter<ItemType>) -> Self {
        self.item_type = Some(filter);
        self
    }

    pub fn master_list(mut self, filter: MasterListFilter) -> Self {
        self.master_list = Some(filter);
        self
    }

    pub fn ignore_for_orders(mut self, ignore_for_orders: bool) -> Self {
        self.ignore_for_orders = Some(ignore_for_orders);
        self
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        mock::{
            mock_item_a, mock_item_b, mock_master_list_master_list_line_filter_test, mock_store_a,
            MockDataInserts,
        },
        test_db, EqualFilter, ItemStoreJoinRow, ItemStoreJoinRowRepository,
        ItemStoreJoinRowRepositoryTrait, MasterListLineFilter, MasterListLineRepository,
        Pagination,
    };

    // An item is barred only where its store join says so: `true` returns the
    // barred lines, `false` every other — a join saying "not barred" and no
    // join at all alike.
    #[actix_rt::test]
    async fn test_master_list_line_query_filter_ignore_for_orders() {
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_master_list_line_query_filter_ignore_for_orders",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .full_master_lists(),
        )
        .await;
        ItemStoreJoinRowRepository::new(&storage_connection)
            .upsert_one(&ItemStoreJoinRow {
                id: "join_a".to_string(),
                store_id: mock_store_a().id,
                item_id: mock_item_a().id,
                ignore_for_orders: true,
                ..Default::default()
            })
            .unwrap();

        let repository = MasterListLineRepository::new(&storage_connection);
        let item_ids = |ignore_for_orders: bool| -> Vec<String> {
            repository
                .query(
                    Pagination::new(),
                    Some(MasterListLineFilter {
                        master_list_id: Some(EqualFilter::equal_to(
                            mock_master_list_master_list_line_filter_test()
                                .master_list
                                .id,
                        )),
                        ignore_for_orders: Some(ignore_for_orders),
                        ..Default::default()
                    }),
                    None,
                    Some(mock_store_a().id),
                )
                .unwrap()
                .into_iter()
                .map(|line| line.item_id)
                .collect()
        };

        assert_eq!(item_ids(true), vec![mock_item_a().id]);
        assert_eq!(item_ids(false), vec![mock_item_b().id]);
    }
}
