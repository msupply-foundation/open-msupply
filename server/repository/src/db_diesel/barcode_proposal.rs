use super::{
    BarcodeProposalRow, DBType, StorageConnection, barcode_proposal_row::barcode_proposal,
    store_row::store,
};
use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{EqualFilter, diesel_macros::apply_equal_filter, repository_error::RepositoryError};

#[derive(Clone, PartialEq, Debug, Default)]
pub struct BarcodeProposalFilter {
    pub id: Option<EqualFilter<String>>,
    pub value: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    /// Proposals made by stores on this site
    pub site_id: Option<i32>,
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    barcode_proposal::table.inner_join(store::table)
}

type BoxedBarcodeProposalQuery = IntoBoxed<'static, query, DBType>;

pub struct BarcodeProposalRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeProposalRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeProposalRepository { connection }
    }

    /// Oldest first, so the first store to propose a barcode is listed first
    pub fn query_by_filter(
        &self,
        filter: BarcodeProposalFilter,
    ) -> Result<Vec<BarcodeProposalRow>, RepositoryError> {
        let result = create_filtered_query(filter)
            .order((
                barcode_proposal::created_datetime.asc(),
                barcode_proposal::id.asc(),
            ))
            .select(barcode_proposal::all_columns)
            .load::<BarcodeProposalRow>(self.connection.lock().connection())?;
        Ok(result)
    }
}

fn create_filtered_query(filter: BarcodeProposalFilter) -> BoxedBarcodeProposalQuery {
    let mut query = query().into_boxed();

    let BarcodeProposalFilter {
        id,
        value,
        item_id,
        store_id,
        site_id,
    } = filter;

    apply_equal_filter!(query, id, barcode_proposal::id);
    apply_equal_filter!(query, value, barcode_proposal::value);
    apply_equal_filter!(query, item_id, barcode_proposal::item_id);
    apply_equal_filter!(query, store_id, barcode_proposal::store_id);
    if let Some(site_id) = site_id {
        query = query.filter(store::site_id.eq(site_id));
    }

    query
}

impl BarcodeProposalFilter {
    pub fn new() -> BarcodeProposalFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn value(mut self, filter: EqualFilter<String>) -> Self {
        self.value = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn site_id(mut self, site_id: i32) -> Self {
        self.site_id = Some(site_id);
        self
    }
}
