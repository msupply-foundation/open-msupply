use super::{DBType, StorageConnection};
use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_simple_string_filter, apply_sort,
        apply_sort_no_case,
    },
    schema::{
        diesel_schema::{
            invoice, invoice::dsl as invoice_dsl, name, name::dsl as name_dsl, store,
            store::dsl as store_dsl,
        },
        InvoiceRow, InvoiceRowStatus, InvoiceRowType, NameRow, StoreRow,
    },
    RepositoryError,
};
use domain::{
    invoice::{Invoice, InvoiceFilter, InvoiceSort, InvoiceSortField, InvoiceStatus, InvoiceType},
    Pagination,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

impl From<InvoiceRowStatus> for InvoiceStatus {
    fn from(status: InvoiceRowStatus) -> Self {
        use InvoiceStatus::*;
        match status {
            InvoiceRowStatus::New => New,
            InvoiceRowStatus::Allocated => Allocated,
            InvoiceRowStatus::Picked => Picked,
            InvoiceRowStatus::Shipped => Shipped,
            InvoiceRowStatus::Delivered => Delivered,
            InvoiceRowStatus::Verified => Verified,
        }
    }
}

impl From<InvoiceRowType> for InvoiceType {
    fn from(r#type: InvoiceRowType) -> Self {
        use InvoiceType::*;
        match r#type {
            InvoiceRowType::OutboundShipment => OutboundShipment,
            InvoiceRowType::InboundShipment => InboundShipment,
            InvoiceRowType::InventoryAdjustment => InventoryAdjustment,
        }
    }
}

impl From<InvoiceStatus> for InvoiceRowStatus {
    fn from(status: InvoiceStatus) -> Self {
        use InvoiceRowStatus::*;
        match status {
            InvoiceStatus::New => New,
            InvoiceStatus::Allocated => Allocated,
            InvoiceStatus::Picked => Picked,
            InvoiceStatus::Shipped => Shipped,
            InvoiceStatus::Delivered => Delivered,
            InvoiceStatus::Verified => Verified,
        }
    }
}

impl From<InvoiceType> for InvoiceRowType {
    fn from(r#type: InvoiceType) -> Self {
        use InvoiceRowType::*;
        match r#type {
            InvoiceType::OutboundShipment => OutboundShipment,
            InvoiceType::InboundShipment => InboundShipment,
            InvoiceType::InventoryAdjustment => InventoryAdjustment,
        }
    }
}

pub struct InvoiceQueryRepository<'a> {
    connection: &'a StorageConnection,
}

type InvoiceQueryJoin = (InvoiceRow, NameRow, StoreRow);

impl<'a> InvoiceQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceQueryRepository { connection }
    }

    pub fn count(&self, filter: Option<InvoiceFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
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
                    apply_sort!(query, sort, invoice_dsl::type_);
                }
                InvoiceSortField::Status => {
                    apply_sort!(query, sort, invoice_dsl::status);
                }
                InvoiceSortField::CreatedDatetime => {
                    apply_sort!(query, sort, invoice_dsl::created_datetime);
                }
                InvoiceSortField::AllocatedDatetime => {
                    apply_sort!(query, sort, invoice_dsl::allocated_datetime);
                }
                InvoiceSortField::PickedDatetime => {
                    apply_sort!(query, sort, invoice_dsl::picked_datetime);
                }
                InvoiceSortField::ShippedDatetime => {
                    apply_sort!(query, sort, invoice_dsl::shipped_datetime);
                }
                InvoiceSortField::DeliveredDatetime => {
                    apply_sort!(query, sort, invoice_dsl::delivered_datetime);
                }
                InvoiceSortField::VerifiedDatetime => {
                    apply_sort!(query, sort, invoice_dsl::verified_datetime);
                }
                InvoiceSortField::OtherPartyName => {
                    apply_sort_no_case!(query, sort, name_dsl::name_);
                }
                InvoiceSortField::InvoiceNumber => {
                    apply_sort!(query, sort, invoice_dsl::invoice_number);
                }
                InvoiceSortField::Comment => {
                    apply_sort_no_case!(query, sort, invoice_dsl::comment);
                }
            }
        } else {
            query = query.order(invoice_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<InvoiceQueryJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<InvoiceQueryJoin, RepositoryError> {
        Ok(invoice_dsl::invoice
            .filter(invoice_dsl::id.eq(row_id))
            .inner_join(name_dsl::name)
            .inner_join(store_dsl::store)
            .first::<InvoiceQueryJoin>(&self.connection.connection)?)
    }
}

fn to_domain((invoice_row, name_row, _store_row): InvoiceQueryJoin) -> Invoice {
    Invoice {
        id: invoice_row.id.to_owned(),
        other_party_name: name_row.name,
        other_party_id: name_row.id,
        other_party_store_id: invoice_row.name_store_id,
        status: InvoiceStatus::from(invoice_row.status),
        on_hold: invoice_row.on_hold,
        r#type: InvoiceType::from(invoice_row.r#type),
        invoice_number: invoice_row.invoice_number,
        their_reference: invoice_row.their_reference,
        comment: invoice_row.comment,
        created_datetime: invoice_row.created_datetime,
        allocated_datetime: invoice_row.allocated_datetime,
        picked_datetime: invoice_row.picked_datetime,
        shipped_datetime: invoice_row.shipped_datetime,
        delivered_datetime: invoice_row.delivered_datetime,
        verified_datetime: invoice_row.verified_datetime,
        colour: invoice_row.colour,
        linked_invoice_id: invoice_row.linked_invoice_id,
        requisition_id: invoice_row.requisition_id,
    }
}

type BoxedInvoiceQuery =
    IntoBoxed<'static, InnerJoin<InnerJoin<invoice::table, name::table>, store::table>, DBType>;

pub fn create_filtered_query<'a>(filter: Option<InvoiceFilter>) -> BoxedInvoiceQuery {
    let mut query = invoice_dsl::invoice
        .inner_join(name_dsl::name)
        .inner_join(store_dsl::store)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, invoice_dsl::id);
        apply_equal_filter!(query, f.invoice_number, invoice_dsl::invoice_number);
        apply_equal_filter!(query, f.name_id, invoice_dsl::name_id);
        apply_equal_filter!(query, f.store_id, invoice_dsl::store_id);
        apply_equal_filter!(query, f.their_reference, invoice_dsl::their_reference);
        apply_equal_filter!(query, f.requisition_id, invoice_dsl::requisition_id);
        apply_simple_string_filter!(query, f.comment, invoice_dsl::comment);
        apply_equal_filter!(query, f.linked_invoice_id, invoice_dsl::linked_invoice_id);

        if let Some(value) = f.r#type {
            if let Some(eq) = value.equal_to {
                let eq = InvoiceRowType::from(eq.clone());
                query = query.filter(invoice_dsl::type_.eq(eq));
            }
        }
        if let Some(value) = f.status {
            if let Some(eq) = value.equal_to {
                let eq = InvoiceRowStatus::from(eq.clone());
                query = query.filter(invoice_dsl::status.eq(eq));
            }
        }

        apply_date_time_filter!(query, f.created_datetime, invoice_dsl::created_datetime);
        apply_date_time_filter!(query, f.allocated_datetime, invoice_dsl::allocated_datetime);
        apply_date_time_filter!(query, f.picked_datetime, invoice_dsl::picked_datetime);
        apply_date_time_filter!(query, f.shipped_datetime, invoice_dsl::shipped_datetime);
        apply_date_time_filter!(query, f.delivered_datetime, invoice_dsl::delivered_datetime);
        apply_date_time_filter!(query, f.verified_datetime, invoice_dsl::verified_datetime);
    }
    query
}
#[cfg(test)]
mod tests {
    use std::cmp::Ordering;

    use super::InvoiceQueryRepository;
    use crate::{mock::MockDataInserts, test_db};
    use domain::{
        invoice::{InvoiceSort, InvoiceSortField},
        Pagination,
    };

    #[actix_rt::test]
    async fn test_invoice_query_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_invoice_query_sort", MockDataInserts::all()).await;
        let repo = InvoiceQueryRepository::new(&connection);

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

        invoices.sort_by(|a, b| match (&a.comment, &b.comment) {
            (None, None) => Ordering::Equal,
            (Some(_), None) => Ordering::Greater,
            (None, Some(_)) => Ordering::Less,
            (Some(a), Some(b)) => a.to_lowercase().cmp(&b.to_lowercase()),
        });

        for (count, invoice) in invoices.iter().enumerate() {
            assert_eq!(
                invoice
                    .comment
                    .clone()
                    .map(|comment| comment.to_lowercase()),
                sorted[count]
                    .comment
                    .clone()
                    .map(|comment| comment.to_lowercase()),
            );
        }
    }
}
