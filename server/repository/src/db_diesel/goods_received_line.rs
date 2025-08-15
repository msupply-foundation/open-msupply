use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

use crate::{
    db_diesel::item_row::item,
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    goods_received_line_row::goods_received_line,
    goods_received_row::{goods_received, GoodsReceivedRow},
    item_link, DBType, EqualFilter, GoodsReceivedLineRow, ItemLinkRow, ItemRow, Pagination,
    RepositoryError, Sort, StorageConnection,
};

type GoodsReceivedLineJoin = (
    GoodsReceivedLineRow,
    (ItemLinkRow, ItemRow),
    GoodsReceivedRow,
);

#[derive(Debug, PartialEq, Clone, Default)]
pub struct GoodsReceivedLine {
    pub goods_received_line_row: GoodsReceivedLineRow,
    pub item_row: ItemRow,
}

#[derive(Clone, Default)]
pub struct GoodsReceivedLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub goods_received_id: Option<EqualFilter<String>>,
}

pub enum GoodsReceivedLineSortField {
    ItemName,
    LineNumber,
    ExpiryDate,
}

pub type GoodsReceivedLineSort = Sort<GoodsReceivedLineSortField>;

pub struct GoodsReceivedLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> GoodsReceivedLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        GoodsReceivedLineRepository { connection }
    }

    pub fn count(&self, filter: Option<GoodsReceivedLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result::<i64>(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: GoodsReceivedLineFilter,
    ) -> Result<Vec<GoodsReceivedLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: GoodsReceivedLineFilter,
    ) -> Result<Option<GoodsReceivedLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<GoodsReceivedLineFilter>,
        sort: Option<GoodsReceivedLineSort>,
    ) -> Result<Vec<GoodsReceivedLine>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                GoodsReceivedLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                GoodsReceivedLineSortField::LineNumber => {
                    apply_sort!(query, sort, goods_received_line::line_number);
                }

                GoodsReceivedLineSortField::ExpiryDate => {
                    apply_sort!(query, sort, goods_received_line::expiry_date);
                }
            }
        } else {
            query = query.order(goods_received_line::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<GoodsReceivedLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedGoodsReceivedLineQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<goods_received_line::table, InnerJoin<item_link::table, item::table>>,
        goods_received::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<GoodsReceivedLineFilter>) -> BoxedGoodsReceivedLineQuery {
    let mut query = goods_received_line::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(goods_received::table)
        .into_boxed();

    if let Some(f) = filter {
        let GoodsReceivedLineFilter {
            goods_received_id,
            id,
        } = f;

        apply_equal_filter!(query, goods_received_id, goods_received::id);
        apply_equal_filter!(query, id, goods_received_line::id);
    }

    query
}

impl GoodsReceivedLineFilter {
    pub fn new() -> GoodsReceivedLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn goods_received_id(mut self, filter: EqualFilter<String>) -> Self {
        self.goods_received_id = Some(filter);
        self
    }
}

fn to_domain(
    (goods_received_line_row, (_item_link_row, item_row), _goods_received_row): GoodsReceivedLineJoin,
) -> GoodsReceivedLine {
    GoodsReceivedLine {
        goods_received_line_row,
        item_row,
    }
}
