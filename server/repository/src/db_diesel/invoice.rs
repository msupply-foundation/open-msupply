use super::{
    clinician_link_row::clinician_link, clinician_row::clinician, invoice_line_row::invoice_line,
    invoice_row::invoice, name_link_row::name_link, name_row::name, store_row::store, ClinicianRow,
    DBType, InvoiceRow, InvoiceStatus, InvoiceType, NameRow, RepositoryError, StorageConnection,
    StoreRow,
};

use crate::{
    diesel_extensions::datetime_coalesce,
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case,
        apply_string_filter,
    },
    ClinicianLinkRow, NameLinkRow,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort, StringFilter};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};
use util::inline_init;

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Invoice {
    pub invoice_row: InvoiceRow,
    pub name_row: NameRow,
    pub store_row: StoreRow,
    pub clinician_row: Option<ClinicianRow>,
}
#[derive(Clone, Default)]
pub struct InvoiceFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_number: Option<EqualFilter<i64>>,
    pub name_id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub store_id: Option<EqualFilter<String>>,
    pub user_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceType>>,
    pub status: Option<EqualFilter<InvoiceStatus>>,
    pub on_hold: Option<bool>,
    pub comment: Option<StringFilter>,
    pub their_reference: Option<EqualFilter<String>>,
    pub transport_reference: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub allocated_datetime: Option<DatetimeFilter>,
    pub picked_datetime: Option<DatetimeFilter>,
    pub shipped_datetime: Option<DatetimeFilter>,
    pub delivered_datetime: Option<DatetimeFilter>,
    pub verified_datetime: Option<DatetimeFilter>,
    pub cancelled_datetime: Option<DatetimeFilter>,
    pub colour: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
    pub linked_invoice_id: Option<EqualFilter<String>>,
    pub stock_line_id: Option<String>,
}

pub enum InvoiceSortField {
    Type,
    OtherPartyName,
    InvoiceNumber,
    Comment,
    Status,
    CreatedDatetime,
    AllocatedDatetime,
    PickedDatetime,
    ShippedDatetime,
    DeliveredDatetime,
    VerifiedDatetime,
    CancelledDatetime,
    TheirReference,
    TransportReference,
    InvoiceDatetime,
}

pub type InvoiceSort = Sort<InvoiceSortField>;

pub struct InvoiceRepository<'a> {
    connection: &'a StorageConnection,
}

type InvoiceJoin = (
    InvoiceRow,
    (NameLinkRow, NameRow),
    StoreRow,
    Option<(ClinicianLinkRow, ClinicianRow)>,
);

impl<'a> InvoiceRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceRepository { connection }
    }

    pub fn count(&self, filter: Option<InvoiceFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: InvoiceFilter) -> Result<Vec<Invoice>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(&self, filter: InvoiceFilter) -> Result<Option<Invoice>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    /// Gets all invoices
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<InvoiceFilter>,
        sort: Option<InvoiceSort>,
    ) -> Result<Vec<Invoice>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                InvoiceSortField::Type => {
                    apply_sort!(query, sort, invoice::type_);
                }
                InvoiceSortField::Status => {
                    apply_sort!(query, sort, invoice::status);
                }
                InvoiceSortField::CreatedDatetime => {
                    apply_sort!(query, sort, invoice::created_datetime);
                }
                InvoiceSortField::InvoiceDatetime => {
                    apply_sort!(
                        query,
                        sort,
                        datetime_coalesce::coalesce(
                            invoice::backdated_datetime,
                            invoice::created_datetime
                        )
                    );
                }
                InvoiceSortField::AllocatedDatetime => {
                    apply_sort!(query, sort, invoice::allocated_datetime);
                }
                InvoiceSortField::PickedDatetime => {
                    apply_sort!(query, sort, invoice::picked_datetime);
                }
                InvoiceSortField::ShippedDatetime => {
                    apply_sort!(query, sort, invoice::shipped_datetime);
                }
                InvoiceSortField::DeliveredDatetime => {
                    apply_sort!(query, sort, invoice::delivered_datetime);
                }
                InvoiceSortField::VerifiedDatetime => {
                    apply_sort!(query, sort, invoice::verified_datetime);
                }
                InvoiceSortField::CancelledDatetime => {
                    apply_sort!(query, sort, invoice::cancelled_datetime);
                }
                InvoiceSortField::OtherPartyName => {
                    apply_sort_no_case!(query, sort, name::name_);
                }
                InvoiceSortField::InvoiceNumber => {
                    apply_sort!(query, sort, invoice::invoice_number);
                }
                InvoiceSortField::Comment => {
                    apply_sort_no_case!(query, sort, invoice::comment);
                }
                InvoiceSortField::TheirReference => {
                    apply_sort_no_case!(query, sort, invoice::their_reference);
                }
                InvoiceSortField::TransportReference => {
                    apply_sort_no_case!(query, sort, invoice::transport_reference);
                }
            }
        } else {
            query = query.order(invoice::id.asc())
        }

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<InvoiceJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn find_one_by_id(&self, record_id: &str) -> Result<InvoiceJoin, RepositoryError> {
        Ok(invoice::table
            .filter(invoice::id.eq(record_id))
            .inner_join(name_link::table.inner_join(name::table))
            .inner_join(store::table)
            .left_join(clinician_link::table.inner_join(clinician::table))
            .first::<InvoiceJoin>(self.connection.lock().connection())?)
    }
}

fn to_domain((invoice_row, (_, name_row), store_row, clinician_link_join): InvoiceJoin) -> Invoice {
    Invoice {
        invoice_row,
        name_row,
        store_row,
        clinician_row: clinician_link_join.map(|(_, clinician_row)| clinician_row),
    }
}

type BoxedInvoiceQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<
            InnerJoin<invoice::table, InnerJoin<name_link::table, name::table>>,
            store::table,
        >,
        InnerJoin<clinician_link::table, clinician::table>,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<InvoiceFilter>) -> BoxedInvoiceQuery {
    let mut query = invoice::table
        .inner_join(name_link::table.inner_join(name::table))
        .inner_join(store::table)
        .left_join(clinician_link::table.inner_join(clinician::table))
        .into_boxed();

    if let Some(f) = filter {
        let InvoiceFilter {
            id,
            invoice_number,
            name_id,
            name,
            store_id,
            user_id,
            r#type,
            status,
            on_hold,
            comment,
            their_reference,
            transport_reference,
            created_datetime,
            allocated_datetime,
            picked_datetime,
            shipped_datetime,
            delivered_datetime,
            verified_datetime,
            cancelled_datetime,
            colour,
            requisition_id,
            linked_invoice_id,
            stock_line_id,
        } = f;

        apply_equal_filter!(query, id, invoice::id);
        apply_equal_filter!(query, invoice_number, invoice::invoice_number);
        apply_equal_filter!(query, name_id, name::id);
        apply_string_filter!(query, name, name::name_);
        apply_equal_filter!(query, store_id, invoice::store_id);
        apply_equal_filter!(query, their_reference, invoice::their_reference);
        apply_equal_filter!(query, requisition_id, invoice::requisition_id);
        apply_string_filter!(query, comment, invoice::comment);
        apply_equal_filter!(query, linked_invoice_id, invoice::linked_invoice_id);
        apply_equal_filter!(query, user_id, invoice::user_id);
        apply_equal_filter!(query, transport_reference, invoice::transport_reference);
        apply_equal_filter!(query, colour, invoice::colour);

        apply_equal_filter!(query, r#type, invoice::type_);
        apply_equal_filter!(query, status, invoice::status);

        if let Some(value) = on_hold {
            query = query.filter(invoice::on_hold.eq(value));
        }

        apply_date_time_filter!(query, created_datetime, invoice::created_datetime);
        apply_date_time_filter!(query, allocated_datetime, invoice::allocated_datetime);
        apply_date_time_filter!(query, picked_datetime, invoice::picked_datetime);
        apply_date_time_filter!(query, shipped_datetime, invoice::shipped_datetime);
        apply_date_time_filter!(query, delivered_datetime, invoice::delivered_datetime);
        apply_date_time_filter!(query, verified_datetime, invoice::verified_datetime);
        apply_date_time_filter!(query, cancelled_datetime, invoice::cancelled_datetime);

        if let Some(stock_line_id) = stock_line_id {
            let invoice_line_query = invoice_line::table
                .filter(invoice_line::stock_line_id.eq(stock_line_id))
                .select(invoice_line::invoice_id);

            query = query.filter(invoice::id.eq_any(invoice_line_query));
        }
    }
    query
}

impl InvoiceStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }

    pub fn equal_any(value: Vec<Self>) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_any = Some(value))
    }
}

impl InvoiceType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }

    pub fn equal_any(value: Vec<Self>) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_any = Some(value))
    }
}

impl InvoiceFilter {
    pub fn new() -> InvoiceFilter {
        InvoiceFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn user_id(mut self, filter: EqualFilter<String>) -> Self {
        self.user_id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<InvoiceType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn invoice_number(mut self, filter: EqualFilter<i64>) -> Self {
        self.invoice_number = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<InvoiceStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn on_hold(mut self, filter: bool) -> Self {
        self.on_hold = Some(filter);
        self
    }

    pub fn transport_reference(mut self, filter: EqualFilter<String>) -> Self {
        self.transport_reference = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }

    pub fn allocated_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.allocated_datetime = Some(filter);
        self
    }

    pub fn picked_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.picked_datetime = Some(filter);
        self
    }

    pub fn shipped_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.shipped_datetime = Some(filter);
        self
    }

    pub fn delivered_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.delivered_datetime = Some(filter);
        self
    }

    pub fn verified_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.verified_datetime = Some(filter);
        self
    }

    pub fn cancelled_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.cancelled_datetime = Some(filter);
        self
    }

    pub fn colour(mut self, filter: EqualFilter<String>) -> Self {
        self.colour = Some(filter);
        self
    }

    pub fn requisition_id(mut self, filter: EqualFilter<String>) -> Self {
        self.requisition_id = Some(filter);
        self
    }

    pub fn linked_invoice_id(mut self, filter: EqualFilter<String>) -> Self {
        self.linked_invoice_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn their_reference(mut self, filter: EqualFilter<String>) -> Self {
        self.their_reference = Some(filter);
        self
    }

    pub fn by_id(id: &str) -> InvoiceFilter {
        InvoiceFilter::new().id(EqualFilter::equal_to(id))
    }

    pub fn new_match_linked_invoice_id(id: &str) -> InvoiceFilter {
        InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(id))
    }

    pub fn stock_line_id(mut self, stock_line_id: String) -> Self {
        self.stock_line_id = Some(stock_line_id);
        self
    }
}

impl InvoiceStatus {
    pub fn index(&self) -> u8 {
        match self {
            InvoiceStatus::New => 1,
            InvoiceStatus::Allocated => 2,
            InvoiceStatus::Picked => 3,
            InvoiceStatus::Shipped => 4,
            InvoiceStatus::Delivered => 5,
            InvoiceStatus::Verified => 6,
            InvoiceStatus::Cancelled => 7,
        }
    }
}

impl Invoice {
    pub fn other_party_name(&self) -> &str {
        &self.name_row.name
    }
    pub fn other_party_id(&self) -> &str {
        &self.name_row.id
    }
    pub fn other_party_store_id(&self) -> &Option<String> {
        &self.invoice_row.name_store_id
    }
}

#[cfg(test)]
mod tests {
    use std::cmp::Ordering;

    use super::{InvoiceRepository, InvoiceSort, InvoiceSortField};
    use crate::Pagination;
    use crate::{mock::MockDataInserts, test_db};

    #[actix_rt::test]
    async fn test_invoice_query_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_invoice_query_sort", MockDataInserts::all()).await;
        let repo = InvoiceRepository::new(&connection);

        let mut invoices = repo.query(Pagination::new(), None, None).unwrap();

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(InvoiceSort {
                    key: InvoiceSortField::Comment,
                    desc: None,
                }),
            )
            .unwrap();

        invoices.sort_by(
            |a, b| match (&a.invoice_row.comment, &b.invoice_row.comment) {
                (None, None) => Ordering::Equal,
                (Some(_), None) => Ordering::Greater,
                (None, Some(_)) => Ordering::Less,
                (Some(a), Some(b)) => a.to_lowercase().cmp(&b.to_lowercase()),
            },
        );

        for (count, invoice) in invoices.iter().enumerate() {
            assert_eq!(
                invoice
                    .invoice_row
                    .comment
                    .clone()
                    .map(|comment| comment.to_lowercase()),
                sorted[count]
                    .invoice_row
                    .comment
                    .clone()
                    .map(|comment| comment.to_lowercase()),
            );
        }
    }
}
