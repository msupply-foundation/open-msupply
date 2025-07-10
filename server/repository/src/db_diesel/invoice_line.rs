use super::{
    invoice_line_row::invoice_line, invoice_row::invoice, item_link_row::item_link, item_row::item,
    location_row::location, reason_option_row::reason_option, stock_line_row::stock_line, DBType,
    DatetimeFilter, InvoiceLineRow, InvoiceLineType, InvoiceRow, LocationRow, ReasonOptionRow,
    StorageConnection,
};

use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_last,
        apply_sort_no_case,
    },
    repository_error::RepositoryError,
    EqualFilter, InvoiceStatus, InvoiceType, ItemLinkRow, ItemRow, Pagination, Sort, StockLineRow,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};
use util::inline_init;

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
        foreign_currency_total_after_tax -> Nullable<Double>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq)]
#[diesel(table_name = invoice_stats)]
pub struct PricingRow {
    pub invoice_id: String,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub stock_total_before_tax: f64,
    pub stock_total_after_tax: f64,
    pub service_total_before_tax: f64,
    pub service_total_after_tax: f64,
    pub tax_percentage: Option<f64>,
    pub foreign_currency_total_after_tax: Option<f64>,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InvoiceLine {
    pub invoice_line_row: InvoiceLineRow,
    pub invoice_row: InvoiceRow,
    pub item_row: ItemRow,
    pub location_row_option: Option<LocationRow>,
    pub stock_line_option: Option<StockLineRow>,
}

pub enum InvoiceLineSortField {
    ItemCode,
    ItemName,
    /// Invoice line batch
    Batch,
    /// Invoice line expiry date
    ExpiryDate,
    /// Invoice line pack size
    PackSize,
    /// Invoice line item stock location name
    LocationName,
}

pub type InvoiceLineSort = Sort<InvoiceLineSortField>;

#[derive(Clone, Default)]
pub struct InvoiceLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub invoice_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceLineType>>,
    pub location_id: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
    pub number_of_packs: Option<EqualFilter<f64>>,
    pub invoice_type: Option<EqualFilter<InvoiceType>>,
    pub invoice_status: Option<EqualFilter<InvoiceStatus>>,
    pub stock_line_id: Option<EqualFilter<String>>,
    pub picked_datetime: Option<DatetimeFilter>,
    pub delivered_datetime: Option<DatetimeFilter>,
    pub verified_datetime: Option<DatetimeFilter>,
    pub reason_option: Option<EqualFilter<String>>,
    pub has_prescribed_quantity: Option<bool>,
    pub has_note: Option<bool>,
    pub program_id: Option<EqualFilter<String>>,
}

impl InvoiceLineFilter {
    pub fn new() -> InvoiceLineFilter {
        InvoiceLineFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
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

    pub fn r#type(mut self, filter: EqualFilter<InvoiceLineType>) -> Self {
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

    pub fn number_of_packs(mut self, filter: EqualFilter<f64>) -> Self {
        self.number_of_packs = Some(filter);
        self
    }

    pub fn invoice_type(mut self, filter: EqualFilter<InvoiceType>) -> Self {
        self.invoice_type = Some(filter);
        self
    }

    pub fn invoice_status(mut self, filter: EqualFilter<InvoiceStatus>) -> Self {
        self.invoice_status = Some(filter);
        self
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }

    pub fn picked_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.picked_datetime = Some(filter);
        self
    }

    pub fn verified_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.verified_datetime = Some(filter);
        self
    }

    pub fn delivered_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.delivered_datetime = Some(filter);
        self
    }

    pub fn reason_option(mut self, filter: EqualFilter<String>) -> Self {
        self.reason_option = Some(filter);
        self
    }

    pub fn has_prescribed_quantity(mut self, filter: bool) -> Self {
        self.has_prescribed_quantity = Some(filter);
        self
    }

    pub fn has_note(mut self, filter: bool) -> Self {
        self.has_note = Some(filter);
        self
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }
}

type InvoiceLineJoin = (
    InvoiceLineRow,
    (ItemLinkRow, ItemRow),
    InvoiceRow,
    Option<LocationRow>,
    Option<StockLineRow>,
    Option<ReasonOptionRow>,
);

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

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: InvoiceLineFilter,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
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
        sort: Option<InvoiceLineSort>,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                InvoiceLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                InvoiceLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code);
                }
                InvoiceLineSortField::Batch => {
                    apply_sort_no_case!(query, sort, invoice_line::batch);
                }
                InvoiceLineSortField::ExpiryDate => {
                    apply_sort_asc_nulls_last!(query, sort, invoice_line::expiry_date);
                }
                InvoiceLineSortField::PackSize => {
                    apply_sort!(query, sort, invoice_line::pack_size);
                }
                InvoiceLineSortField::LocationName => {
                    apply_sort_no_case!(query, sort, location::name);
                }
            };
        } else {
            query = query.order_by(invoice_line::id.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<InvoiceLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    /// Calculates invoice line stats for a given invoice ids
    pub fn stats(&self, invoice_ids: &[String]) -> Result<Vec<PricingRow>, RepositoryError> {
        let results: Vec<PricingRow> = invoice_stats::table
            .filter(invoice_stats::invoice_id.eq_any(invoice_ids))
            .load(self.connection.lock().connection())?;
        Ok(results)
    }
}

type BoxedInvoiceLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<
            LeftJoin<
                InnerJoin<
                    InnerJoin<invoice_line::table, InnerJoin<item_link::table, item::table>>,
                    invoice::table,
                >,
                location::table,
            >,
            stock_line::table,
        >,
        reason_option::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<InvoiceLineFilter>) -> BoxedInvoiceLineQuery {
    let mut query = invoice_line::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(invoice::table)
        .left_join(location::table)
        .left_join(stock_line::table)
        .left_join(reason_option::table)
        .into_boxed();

    if let Some(f) = filter {
        let InvoiceLineFilter {
            id,
            store_id,
            invoice_id,
            item_id,
            r#type,
            location_id,
            requisition_id,
            number_of_packs,
            invoice_type,
            invoice_status,
            stock_line_id,
            picked_datetime,
            delivered_datetime,
            verified_datetime,
            reason_option,
            has_prescribed_quantity,
            has_note,
            program_id,
        } = f;

        apply_equal_filter!(query, id, invoice_line::id);
        apply_equal_filter!(query, store_id, invoice::store_id);
        apply_equal_filter!(query, requisition_id, invoice::requisition_id);
        apply_equal_filter!(query, invoice_id, invoice_line::invoice_id);
        apply_equal_filter!(query, location_id, invoice_line::location_id);
        apply_equal_filter!(query, item_id, item_link::item_id);
        apply_equal_filter!(query, r#type, invoice_line::type_);
        apply_equal_filter!(query, number_of_packs, invoice_line::number_of_packs);
        apply_equal_filter!(query, invoice_type, invoice::type_);
        apply_equal_filter!(query, invoice_status, invoice::status);
        apply_equal_filter!(query, stock_line_id, stock_line::id);
        apply_equal_filter!(query, reason_option, reason_option::reason);
        apply_date_time_filter!(query, picked_datetime, invoice::picked_datetime);
        apply_date_time_filter!(query, delivered_datetime, invoice::delivered_datetime);
        apply_date_time_filter!(query, verified_datetime, invoice::verified_datetime);
        if let Some(has_prescribed_quantity) = has_prescribed_quantity {
            if has_prescribed_quantity {
                query = query
                    .filter(invoice_line::prescribed_quantity.is_not_null())
                    .filter(
                        invoice_line::prescribed_quantity
                            .gt(0.0)
                            .or(invoice_line::prescribed_quantity.is_not_null()),
                    );
            } else {
                query = query.filter(invoice_line::prescribed_quantity.is_null());
            }
        }

        if let Some(has_note) = has_note {
            if has_note {
                query = query.filter(invoice_line::note.is_not_null());
            } else {
                query = query.filter(invoice_line::note.is_null());
            }
        }

        apply_equal_filter!(query, program_id, invoice::program_id);
    }

    query
}

fn to_domain(
    (invoice_line_row, (_, item_row), invoice_row, location_row_option, stock_line_option, _): InvoiceLineJoin,
) -> InvoiceLine {
    InvoiceLine {
        invoice_line_row,
        invoice_row,
        item_row,
        location_row_option,
        stock_line_option,
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
        let is_stock = matches!(row.r#type, InvoiceLineType::StockIn)
            || matches!(row.r#type, InvoiceLineType::StockOut);
        let is_service = matches!(row.r#type, InvoiceLineType::Service);

        PricingRow {
            invoice_id: row.invoice_id.clone(),
            total_before_tax: row.total_before_tax,
            total_after_tax: row.total_after_tax,
            stock_total_before_tax: if is_stock { row.total_before_tax } else { 0.0 },
            stock_total_after_tax: if is_stock { row.total_after_tax } else { 0.0 },
            service_total_before_tax: if is_service {
                row.total_before_tax
            } else {
                0.0
            },
            service_total_after_tax: if is_service { row.total_after_tax } else { 0.0 },
            tax_percentage: row.tax_percentage,
            foreign_currency_total_after_tax: row.foreign_currency_price_before_tax.map(|price| {
                row.tax_percentage
                    .map(|tax| price + (price * tax / 100.0))
                    .unwrap_or(price)
            }),
        }
    }
}

impl InvoiceLineType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }
}
