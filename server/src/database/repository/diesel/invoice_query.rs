use super::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort, StorageConnection};

use crate::{
    database::{
        repository::RepositoryError,
        schema::{
            diesel_schema::{
                invoice::dsl as invoice_dsl, name_table::dsl as name_dsl, store::dsl as store_dsl,
            },
            InvoiceRow, InvoiceRowStatus, InvoiceRowType, NameRow, StoreRow,
        },
    },
    server::service::graphql::schema::queries::pagination::{Pagination, PaginationOption},
};

use diesel::prelude::*;

pub struct InvoiceFilter {
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceRowType>>,
    pub status: Option<EqualFilter<InvoiceRowStatus>>,
    pub comment: Option<SimpleStringFilter>,
    pub their_reference: Option<EqualFilter<String>>,
    pub entry_datetime: Option<DatetimeFilter>,
    pub confirm_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
}

pub enum InvoiceSortField {
    Type,
    Status,
    EntryDatetime,
    ConfirmDatetime,
    FinalisedDateTime,
}

pub type InvoiceSort = Sort<InvoiceSortField>;

pub struct InvoiceQueryRepository<'a> {
    connection: &'a StorageConnection,
}

pub type InvoiceQueryJoin = (InvoiceRow, NameRow, StoreRow);

impl<'a> InvoiceQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceQueryRepository { connection }
    }

    pub fn count(&self) -> Result<i64, RepositoryError> {
        Ok(invoice_dsl::invoice
            .count()
            .get_result(&self.connection.connection)?)
    }

    /// Gets all invoices
    pub fn all(
        &self,
        pagination: &Option<Pagination>,
        filter: &Option<InvoiceFilter>,
        sort: &Option<InvoiceSort>,
    ) -> Result<Vec<InvoiceQueryJoin>, RepositoryError> {
        let mut query = invoice_dsl::invoice
            .inner_join(name_dsl::name_table)
            .inner_join(store_dsl::store)
            .offset(pagination.offset())
            .limit(pagination.first())
            .into_boxed();

        if let Some(f) = filter {
            if let Some(value) = &f.name_id {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::name_id.eq(eq));
                }
            }
            if let Some(value) = &f.store_id {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::store_id.eq(eq));
                }
            }
            if let Some(value) = &f.r#type {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::type_.eq(eq));
                }
            }
            if let Some(value) = &f.status {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::status.eq(eq));
                }
            }
            if let Some(value) = &f.comment {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::comment.eq(eq));
                } else if let Some(like) = &value.like {
                    query = query.filter(invoice_dsl::comment.like(like));
                }
            }
            if let Some(value) = &f.their_reference {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::their_reference.eq(eq));
                }
            }
            if let Some(value) = &f.entry_datetime {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::entry_datetime.eq(eq));
                }
                if let Some(before_or_equal) = &value.before_or_equal_to {
                    query = query.filter(invoice_dsl::entry_datetime.le(before_or_equal));
                }
                if let Some(after_or_equal) = &value.after_or_equal_to {
                    query = query.filter(invoice_dsl::entry_datetime.ge(after_or_equal));
                }
            }
            if let Some(value) = &f.confirm_datetime {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::confirm_datetime.eq(eq));
                }
                if let Some(before_or_equal) = &value.before_or_equal_to {
                    query = query.filter(invoice_dsl::confirm_datetime.le(before_or_equal));
                }
                if let Some(after_or_equal) = &value.after_or_equal_to {
                    query = query.filter(invoice_dsl::confirm_datetime.ge(after_or_equal));
                }
            }
            if let Some(value) = &f.finalised_datetime {
                if let Some(eq) = &value.equal_to {
                    query = query.filter(invoice_dsl::finalised_datetime.eq(eq));
                }
                if let Some(before_or_equal) = &value.before_or_equal_to {
                    query = query.filter(invoice_dsl::finalised_datetime.le(before_or_equal));
                }
                if let Some(after_or_equal) = &value.after_or_equal_to {
                    query = query.filter(invoice_dsl::finalised_datetime.ge(after_or_equal));
                }
            }
        }

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
            }
        } else {
            query = query.order(invoice_dsl::id.asc())
        }

        Ok(query.load::<InvoiceQueryJoin>(&self.connection.connection)?)
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<InvoiceQueryJoin, RepositoryError> {
        Ok(invoice_dsl::invoice
            .filter(invoice_dsl::id.eq(row_id))
            .inner_join(name_dsl::name_table)
            .inner_join(store_dsl::store)
            .first::<InvoiceQueryJoin>(&self.connection.connection)?)
    }
}
