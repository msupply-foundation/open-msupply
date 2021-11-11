use super::{DBType, StorageConnection};
use crate::{
    diesel_extensions::OrderByExtensions,
    repository::RepositoryError,
    schema::{
        diesel_schema::{
            invoice, invoice::dsl as invoice_dsl, name_table, name_table::dsl as name_dsl, store,
            store::dsl as store_dsl,
        },
        InvoiceRow, InvoiceRowStatus, InvoiceRowType, NameRow, StoreRow,
    },
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
            InvoiceRowStatus::Draft => Draft,
            InvoiceRowStatus::Confirmed => Confirmed,
            InvoiceRowStatus::Finalised => Finalised,
        }
    }
}

impl From<InvoiceRowType> for InvoiceType {
    fn from(r#type: InvoiceRowType) -> Self {
        use InvoiceType::*;
        match r#type {
            InvoiceRowType::OutboundShipment => OutboundShipment,
            InvoiceRowType::InboundShipment => InboundShipment,
        }
    }
}

impl From<InvoiceStatus> for InvoiceRowStatus {
    fn from(status: InvoiceStatus) -> Self {
        use InvoiceRowStatus::*;
        match status {
            InvoiceStatus::Draft => Draft,
            InvoiceStatus::Confirmed => Confirmed,
            InvoiceStatus::Finalised => Finalised,
        }
    }
}

impl From<InvoiceType> for InvoiceRowType {
    fn from(r#type: InvoiceType) -> Self {
        use InvoiceRowType::*;
        match r#type {
            InvoiceType::OutboundShipment => OutboundShipment,
            InvoiceType::InboundShipment => InboundShipment,
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
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::type_.desc());
                    } else {
                        query = query.order(invoice_dsl::type_.asc());
                    }
                }
                InvoiceSortField::Status => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::status.desc());
                    } else {
                        query = query.order(invoice_dsl::status.asc());
                    }
                }
                InvoiceSortField::EntryDatetime => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::entry_datetime.desc());
                    } else {
                        query = query.order(invoice_dsl::entry_datetime.asc());
                    }
                }
                InvoiceSortField::ConfirmDatetime => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::confirm_datetime.desc());
                    } else {
                        query = query.order(invoice_dsl::confirm_datetime.asc());
                    }
                }
                InvoiceSortField::FinalisedDateTime => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::finalised_datetime.desc());
                    } else {
                        query = query.order(invoice_dsl::finalised_datetime.asc());
                    }
                }
                InvoiceSortField::OtherPartyName => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::name_id.desc_no_case());
                    } else {
                        query = query.order(invoice_dsl::name_id.asc_no_case());
                    }
                }
                InvoiceSortField::InvoiceNumber => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::invoice_number.desc());
                    } else {
                        query = query.order(invoice_dsl::invoice_number.asc());
                    }
                }
                InvoiceSortField::Comment => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(invoice_dsl::comment.desc_no_case());
                    } else {
                        query = query.order(invoice_dsl::comment.asc_no_case());
                    }
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
            .inner_join(name_dsl::name_table)
            .inner_join(store_dsl::store)
            .first::<InvoiceQueryJoin>(&self.connection.connection)?)
    }
}

fn to_domain((invoice_row, name_row, _store_row): InvoiceQueryJoin) -> Invoice {
    Invoice {
        id: invoice_row.id.to_owned(),
        other_party_name: name_row.name,
        other_party_id: name_row.id,
        status: InvoiceStatus::from(invoice_row.status),
        on_hold: invoice_row.on_hold,
        r#type: InvoiceType::from(invoice_row.r#type),
        invoice_number: invoice_row.invoice_number,
        their_reference: invoice_row.their_reference,
        comment: invoice_row.comment,
        entry_datetime: invoice_row.entry_datetime,
        confirm_datetime: invoice_row.confirm_datetime,
        finalised_datetime: invoice_row.finalised_datetime,
        color: invoice_row.color,
    }
}

type BoxedInvoiceQuery = IntoBoxed<
    'static,
    InnerJoin<InnerJoin<invoice::table, name_table::table>, store::table>,
    DBType,
>;

pub fn create_filtered_query<'a>(filter: Option<InvoiceFilter>) -> BoxedInvoiceQuery {
    let mut query = invoice_dsl::invoice
        .inner_join(name_dsl::name_table)
        .inner_join(store_dsl::store)
        .into_boxed();

    if let Some(f) = filter {
        if let Some(value) = f.id {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::id.eq(eq));
            }
        }

        if let Some(value) = f.invoice_number {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::invoice_number.eq(eq));
            }
        }

        if let Some(value) = f.name_id {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::name_id.eq(eq));
            }
        }
        if let Some(value) = f.store_id {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::store_id.eq(eq));
            }
        }
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
        if let Some(value) = f.comment {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::comment.eq(eq));
            } else if let Some(like) = value.like {
                query = query.filter(invoice_dsl::comment.like(like));
            }
        }
        if let Some(value) = f.their_reference {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::their_reference.eq(eq));
            }
        }
        if let Some(value) = f.entry_datetime {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::entry_datetime.eq(eq));
            }
            if let Some(before_or_equal) = value.before_or_equal_to {
                query = query.filter(invoice_dsl::entry_datetime.le(before_or_equal));
            }
            if let Some(after_or_equal) = value.after_or_equal_to {
                query = query.filter(invoice_dsl::entry_datetime.ge(after_or_equal));
            }
        }
        if let Some(value) = f.confirm_datetime {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::confirm_datetime.eq(eq));
            }
            if let Some(before_or_equal) = value.before_or_equal_to {
                query = query.filter(invoice_dsl::confirm_datetime.le(before_or_equal));
            }
            if let Some(after_or_equal) = value.after_or_equal_to {
                query = query.filter(invoice_dsl::confirm_datetime.ge(after_or_equal));
            }
        }
        if let Some(value) = f.finalised_datetime {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_dsl::finalised_datetime.eq(eq));
            }
            if let Some(before_or_equal) = value.before_or_equal_to {
                query = query.filter(invoice_dsl::finalised_datetime.le(before_or_equal));
            }
            if let Some(after_or_equal) = value.after_or_equal_to {
                query = query.filter(invoice_dsl::finalised_datetime.ge(after_or_equal));
            }
        }
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
        let (_, connection, _) =
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
            println!(
                "{:?} {:?}",
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
