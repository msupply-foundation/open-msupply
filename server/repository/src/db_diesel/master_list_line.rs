use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    EqualFilter, ItemLinkRow, ItemRow, ItemType, Pagination, Sort,
};

use super::{
    item_link_row::{item_link, item_link::dsl as item_link_dsl},
    item_row::{item, item::dsl as item_dsl},
    master_list_line_row::{master_list_line, master_list_line::dsl as master_list_line_dsl},
    DBType, MasterListLineRow, StorageConnection,
};

use diesel::{
    helper_types::{InnerJoin, IntoBoxed},
    prelude::*,
};

#[derive(Clone, Debug, PartialEq)]
pub struct MasterListLine {
    pub id: String,
    pub item_id: String,
    pub master_list_id: String,
}

type MasterListLineJoin = (MasterListLineRow, (ItemLinkRow, ItemRow));

#[derive(Clone, Debug, PartialEq, Default)]
pub struct MasterListLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub master_list_id: Option<EqualFilter<String>>,
    pub item_type: Option<EqualFilter<ItemType>>,
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
        let query = create_filtered_query(filter)?;

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: MasterListLineFilter,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(Some(filter))?;

        query = query.order(master_list_line_dsl::id.asc());

        let result = query.load::<MasterListLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MasterListLineFilter>,
        sort: Option<MasterListLineSort>,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(filter)?;

        if let Some(sort) = sort {
            match sort.key {
                MasterListLineSortField::Name => {
                    apply_sort_no_case!(query, sort, item_dsl::name);
                }
                MasterListLineSortField::Code => {
                    apply_sort_no_case!(query, sort, item_dsl::code);
                }
            }
        } else {
            query = query.order(master_list_line_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<MasterListLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedMasterListLineQuery = IntoBoxed<
    'static,
    InnerJoin<master_list_line::table, InnerJoin<item_link::table, item::table>>,
    DBType,
>;

fn create_filtered_query(
    filter: Option<MasterListLineFilter>,
) -> Result<BoxedMasterListLineQuery, RepositoryError> {
    let mut query = master_list_line_dsl::master_list_line
        .inner_join(item_link_dsl::item_link.inner_join(item_dsl::item))
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, master_list_line_dsl::id);
        apply_equal_filter!(query, f.item_id, item_dsl::id);
        apply_equal_filter!(
            query,
            f.master_list_id,
            master_list_line_dsl::master_list_id
        );
        apply_equal_filter!(query, f.item_type, item_dsl::type_)
    }

    Ok(query)
}

fn to_domain((master_list_line_row, (_, item_row)): MasterListLineJoin) -> MasterListLine {
    MasterListLine {
        id: master_list_line_row.id,
        master_list_id: master_list_line_row.master_list_id,
        item_id: item_row.id,
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
}
