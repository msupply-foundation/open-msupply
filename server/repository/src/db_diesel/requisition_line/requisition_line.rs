use crate::{
    db_diesel::item_row::item, diesel_macros::apply_equal_filter, item_link,
    repository_error::RepositoryError, requisition_row::requisition, DBType, ItemLinkRow, ItemRow,
    RequisitionRow, StorageConnection,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

use super::{
    requisition_line_row::{requisition_line, requisition_line::dsl as requisition_line_dsl},
    RequisitionLineFilter, RequisitionLineRow,
};

type RequisitionLineJoin = (RequisitionLineRow, (ItemLinkRow, ItemRow), RequisitionRow);

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequisitionLine {
    pub requisition_line_row: RequisitionLineRow,
    pub item_row: ItemRow,
    pub requisition_row: RequisitionRow,
}

pub struct RequisitionLineRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> RequisitionLineRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        RequisitionLineRepository { connection }
    }

    pub fn count(&self, filter: Option<RequisitionLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter)?;
        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_one(
        &self,
        filter: RequisitionLineFilter,
    ) -> Result<Option<RequisitionLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: RequisitionLineFilter,
    ) -> Result<Vec<RequisitionLine>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<RequisitionLineFilter>,
    ) -> Result<Vec<RequisitionLine>, RepositoryError> {
        let mut query = create_filtered_query(filter)?;

        query = query.order(requisition_line_dsl::id.asc());

        let result = query.load::<RequisitionLineJoin>(&mut self.connection.connection)?;

        Ok(result
            .into_iter()
            .map(
                |(requisition_line_row, (_, item_row), requisition_row)| RequisitionLine {
                    requisition_line_row,
                    item_row,
                    requisition_row,
                },
            )
            .collect())
    }
}

type BoxedRequisitionLineQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<requisition_line::table, InnerJoin<item_link::table, item::table>>,
        requisition::table,
    >,
    DBType,
>;

fn create_filtered_query(
    filter: Option<RequisitionLineFilter>,
) -> Result<BoxedRequisitionLineQuery, RepositoryError> {
    let mut query = requisition_line_dsl::requisition_line
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(requisition::table)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, requisition_line::id);
        apply_equal_filter!(query, f.store_id, requisition::store_id);
        apply_equal_filter!(
            query,
            f.requisition_id,
            requisition_line_dsl::requisition_id
        );
        apply_equal_filter!(
            query,
            f.requested_quantity,
            requisition_line_dsl::requested_quantity
        );
        apply_equal_filter!(query, f.item_id, item::id);
        apply_equal_filter!(query, f.r#type, requisition::type_);
        apply_equal_filter!(query, f.status, requisition::status);
    }

    Ok(query)
}
