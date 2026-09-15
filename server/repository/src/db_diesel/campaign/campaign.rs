use super::campaign_row::{campaign, CampaignRow};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    lower,
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};
use diesel::{dsl::IntoBoxed, prelude::*};

pub type Campaign = CampaignRow;

pub enum CampaignSortField {
    Name,
}

pub type CampaignSort = Sort<CampaignSortField>;

#[derive(Clone, Default)]
pub struct CampaignFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

impl CampaignFilter {
    pub fn new() -> CampaignFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }
}

pub struct CampaignRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CampaignRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CampaignRepository { connection }
    }

    pub fn count(&self, filter: Option<CampaignFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(&self, filter: CampaignFilter) -> Result<Option<Campaign>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: CampaignFilter,
    ) -> Result<Vec<Campaign>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<CampaignFilter>,
        sort: Option<CampaignSort>,
    ) -> Result<Vec<Campaign>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                CampaignSortField::Name => {
                    apply_sort_no_case!(query, sort, campaign::name);
                }
            }
        } else {
            query = query.order(campaign::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<CampaignRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedCampaignQuery = IntoBoxed<'static, campaign::table, DBType>;

fn create_filtered_query(filter: Option<CampaignFilter>) -> BoxedCampaignQuery {
    let mut query = campaign::table.into_boxed();

    if let Some(f) = filter {
        let CampaignFilter { id, name } = f;

        apply_equal_filter!(query, id, campaign::id);

        if let Some(name_filter) = name {
            if let Some(name_to_match) = name_filter.equal_to {
                query = query.filter(lower(campaign::name).eq(lower(name_to_match)))
            }
        }
    }

    query = query.filter(campaign::deleted_datetime.is_null());

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        campaign::{
            campaign::CampaignRepository,
            campaign_row::{CampaignRow, CampaignRowRepository},
        },
        mock::MockDataInserts,
        test_db, EqualFilter, StringFilter,
    };

    use super::CampaignFilter;

    #[actix_rt::test]
    async fn test_campaign_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_campaign_query_repository", MockDataInserts::none()).await;

        let id = "test_id".to_string();
        let name = "test_name".to_string();

        // Insert a row
        let _campaign_row = CampaignRowRepository::new(&storage_connection)
            .upsert_one(&CampaignRow {
                id: id.clone(),
                name: name.clone(),
                start_date: None,
                end_date: None,
                deleted_datetime: None,
            })
            .unwrap();

        // Query by id
        let campaign_row = CampaignRepository::new(&storage_connection)
            .query_one(CampaignFilter::new().id(EqualFilter::equal_to(id.to_string())))
            .unwrap()
            .unwrap();

        assert_eq!(campaign_row.id, id);
        assert_eq!(campaign_row.name, name);

        // Query by name
        let campaign_row = CampaignRepository::new(&storage_connection)
            .query_one(CampaignFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();

        assert_eq!(campaign_row.id, id);
        assert_eq!(campaign_row.name, name);
    }
}
