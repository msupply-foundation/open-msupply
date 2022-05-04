use super::{
    invoice_line::invoice_stats::dsl as invoice_stats_dsl,
    invoice_line_row::{invoice_line, invoice_line::dsl as invoice_line_dsl},
    invoice_row::{invoice, invoice::dsl as invoice_dsl},
    location_row::{location, location::dsl as location_dsl},
    DBType, InvoiceLineRow, InvoiceLineRowType, InvoiceRow, LocationRow, StorageConnection,
};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, EqualFilter, Pagination,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

table! {
    invoice_stats (invoice_id) {
        invoice_id -> Text,
        total_before_tax -> Double,
        total_after_tax -> Double,
        stock_total_before_tax -> Double,
        stock_total_after_tax -> Double,
        service_total_before_tax -> Double,
        service_total_after_tax -> Double,
        tax_percentage -> Nullable<Double>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq)]
#[table_name = "invoice_stats"]
pub struct PricingRow {
    pub invoice_id: String,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub stock_total_before_tax: f64,
    pub stock_total_after_tax: f64,
    pub service_total_before_tax: f64,
    pub service_total_after_tax: f64,
    pub tax_percentage: Option<f64>,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InvoiceLine {
    pub invoice_line_row: InvoiceLineRow,
    pub invoice_row: InvoiceRow,
    pub location_row_option: Option<LocationRow>,
}

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
        self.query(Pagination::new(), Some(filter))
    }

    pub fn query_one(
        &self,
        filter: InvoiceLineFilter,
    ) -> Result<Option<InvoiceLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<InvoiceLineFilter>,
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
    pub fn stats(&self, invoice_ids: &[String]) -> Result<Vec<PricingRow>, RepositoryError> {
        let results: Vec<PricingRow> = invoice_stats_dsl::invoice_stats
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

fn to_domain((invoice_line_row, invoice_row, location_row_option): InvoiceLineJoin) -> InvoiceLine {
    InvoiceLine {
        invoice_line_row,
        invoice_row,
        location_row_option,
    }
}

impl InvoiceLine {
    pub fn location_name(&self) -> Option<&str> {
        self.location_row_option
            .as_ref()
            .map(|location_row| location_row.name.as_str())
    }

    pub fn pricing(&self) -> PricingRow {
        let row = &self.invoice_line_row;
        let is_stock = matches!(row.r#type, InvoiceLineRowType::StockIn)
            || matches!(row.r#type, InvoiceLineRowType::StockOut);
        let is_service = matches!(row.r#type, InvoiceLineRowType::Service);

        PricingRow {
            invoice_id: row.invoice_id.clone(),
            total_before_tax: row.total_before_tax,
            total_after_tax: row.total_after_tax,
            stock_total_before_tax: is_stock.then(|| row.total_before_tax).unwrap_or(0.0),
            stock_total_after_tax: is_stock.then(|| row.total_after_tax).unwrap_or(0.0),
            service_total_before_tax: is_service.then(|| row.total_before_tax).unwrap_or(0.0),
            service_total_after_tax: is_service.then(|| row.total_after_tax).unwrap_or(0.0),
            tax_percentage: row.tax,
        }
    }
}

impl InvoiceLineRowType {
    pub fn equal_to(&self) -> EqualFilter<InvoiceLineRowType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }
}
