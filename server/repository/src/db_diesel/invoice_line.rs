use crate::{
    diesel_macros::apply_equal_filter,
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            invoice, invoice::dsl as invoice_dsl, invoice_line,
            invoice_line::dsl as invoice_line_dsl, invoice_stats::dsl as invoice_stats_dsl,
            location, location::dsl as location_dsl,
        },
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceStatsRow, LocationRow,
    },
};
use domain::{
    invoice_line::{InvoiceLine, InvoiceLineSort},
    EqualFilter, Pagination,
};

pub struct InvoiceLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceLineRowType>>,
    pub location_id: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
}

impl InvoiceLineFilter {
    pub fn new() -> InvoiceLineFilter {
        InvoiceLineFilter {
            id: None,
            invoice_id: None,
            r#type: None,
            item_id: None,
            location_id: None,
            requisition_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn invoice_id(mut self, filter: EqualFilter<String>) -> Self {
        self.invoice_id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<InvoiceLineRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }

    pub fn requisition_id(mut self, filter: EqualFilter<String>) -> Self {
        self.requisition_id = Some(filter);
        self
    }
}

use super::{DBType, StorageConnection};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

type InvoiceLineJoin = (InvoiceLineRow, InvoiceRow, Option<LocationRow>);

pub struct InvoiceLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceLineRepository { connection }
    }

    pub fn count(&self, filter: Option<InvoiceLineFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: InvoiceLineFilter,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<InvoiceLineFilter>,
        _: Option<InvoiceLineSort>,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<InvoiceLineJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    /// Calculates invoice line stats for a given invoice ids
    pub fn stats(&self, invoice_ids: &[String]) -> Result<Vec<InvoiceStatsRow>, RepositoryError> {
        let results: Vec<InvoiceStatsRow> = invoice_stats_dsl::invoice_stats
            .filter(invoice_stats_dsl::invoice_id.eq_any(invoice_ids))
            .load(&self.connection.connection)?;
        Ok(results)
    }
}

type BoxedInvoiceLineQuery = IntoBoxed<
    'static,
    LeftJoin<InnerJoin<invoice_line::table, invoice::table>, location::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<InvoiceLineFilter>) -> BoxedInvoiceLineQuery {
    let mut query = invoice_line_dsl::invoice_line
        .inner_join(invoice_dsl::invoice)
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, invoice_line_dsl::id);
        apply_equal_filter!(query, f.requisition_id, invoice_dsl::requisition_id);
        apply_equal_filter!(query, f.invoice_id, invoice_line_dsl::invoice_id);
        apply_equal_filter!(query, f.location_id, invoice_line_dsl::location_id);
        apply_equal_filter!(query, f.item_id, invoice_line_dsl::item_id);
        apply_equal_filter!(query, f.r#type, invoice_line_dsl::type_);
    }

    query
}

fn to_domain((invoice_line, invoice_row, location_row_option): InvoiceLineJoin) -> InvoiceLine {
    InvoiceLine {
        id: invoice_line.id,
        stock_line_id: invoice_line.stock_line_id,
        invoice_id: invoice_line.invoice_id,
        item_id: invoice_line.item_id,
        location_id: invoice_line.location_id,
        item_name: invoice_line.item_name,
        item_code: invoice_line.item_code,
        pack_size: invoice_line.pack_size,
        r#type: invoice_line.r#type.to_domain(),
        number_of_packs: invoice_line.number_of_packs,
        cost_price_per_pack: invoice_line.cost_price_per_pack,
        sell_price_per_pack: invoice_line.sell_price_per_pack,
        batch: invoice_line.batch,
        expiry_date: invoice_line.expiry_date,
        note: invoice_line.note,
        location_name: location_row_option.map(|location_row| location_row.name),
        requisition_id: invoice_row.requisition_id,
    }
}
