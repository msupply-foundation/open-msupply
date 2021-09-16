use super::{get_connection, DBBackendConnection};
use crate::{
    database::{
        repository::RepositoryError,
        schema::{
            diesel_schema::{
                name_store_join::dsl::name_store_join, name_table::dsl as name_table_dsl,
            },
            NameRow, NameStoreJoinRow,
        },
    },
    server::service::graphql::schema::{
        queries::pagination::{Pagination, PaginationOption},
        types::NameQuery,
    },
};

use diesel::{
    debug_query,
    pg::Pg,
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

type NameAndNameStoreJoin = (NameRow, Option<NameStoreJoinRow>);

impl From<NameAndNameStoreJoin> for NameQuery {
    fn from((name_row, name_store_join_row_option): NameAndNameStoreJoin) -> Self {
        let (is_customer, is_supplier) = match name_store_join_row_option {
            Some(name_store_join_row) => (
                name_store_join_row.name_is_customer,
                name_store_join_row.name_is_supplier,
            ),
            None => (false, false),
        };

        NameQuery {
            id: name_row.id,
            name: name_row.name,
            code: name_row.code,
            is_customer,
            is_supplier,
        }
    }
}

pub struct NameQueryRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl NameQueryRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> NameQueryRepository {
        NameQueryRepository { pool }
    }

    pub fn count(&self) -> Result<i64, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(name_table_dsl::name_table
            .count()
            .get_result(&*connection)?)
    }

    pub fn all(&self, pagination: &Option<Pagination>) -> Result<Vec<NameQuery>, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(name_table_dsl::name_table
            .left_join(name_store_join)
            .offset(pagination.offset())
            .limit(pagination.first())
            .load::<NameAndNameStoreJoin>(&*connection)?
            .into_iter()
            .map(NameQuery::from)
            .collect())
    }
    // There is a bug in Diesel, i'll create an issue in their repository, can do the following to see output

    // println!("{}",debug_query::<Pg, _>( &name_table_dsl::name_table.left_join(name_store_join)
    // .offset(pagination.offset())
    //  .limit(pagination.first())).to_string());

    // which results in

    // SELECT "name"."id", "name"."name", "name"."code", "name"."is_customer", "name"."is_supplier", "name_store_join"."id", "name_store_join"."name_id", "name_store_join"."store_id", "name_store_join"."name_is_customer", "name_store_join"."name_is_supplier" FROM ("name" LEFT OUTER JOIN "name_store_join" ON "name_store_join"."name_id" = "name"."id");

    // this is NOT equivelant to

    // SELECT "name"."id", "name"."name", "name"."code", "name"."is_customer", "name"."is_supplier", "name_store_join"."id", "name_store_join"."name_id", "name_store_join"."store_id", "name_store_join"."name_is_customer", "name_store_join"."name_is_supplier"  from "name" left outer join name_store_join on name_store_join.id = "name".id;

    // and results in duplicate names selected (should only be one set of unique names), this would be problematic if more then one name_store_join for the same store and name (which should not happen)
    // but can also be problematic if we are relying on proper left join
}

#[cfg(test)]
mod tests {
    use crate::{
        database::{
            repository::{get_repositories, NameQueryRepository, NameRepository},
            schema::NameRow,
        },
        server::{
            data::RepositoryRegistry,
            service::graphql::schema::{
                queries::pagination::{Pagination, DEFAULT_PAGE_SIZE},
                types::NameQuery,
            },
        },
        util::test_db,
    };
    use std::convert::TryFrom;

    fn data() -> (Vec<NameRow>, Vec<NameQuery>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(NameRow {
                id: format!("id{}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                is_customer: true,
                is_supplier: true,
            });

            queries.push(NameQuery {
                id: format!("id{}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                is_customer: false,
                is_supplier: false,
            });
        }
        (rows, queries)
    }

    #[actix_rt::test]
    async fn test_name_query_repository() {
        // Prepare
        let settings = test_db::get_test_settings("test_name_query_repository");

        test_db::setup(&settings.database).await;
        let registry = RepositoryRegistry {
            repositories: get_repositories(&settings).await,
        };

        let name_row_respository = registry.get::<NameRepository>();
        let (rows, queries) = data();
        for row in rows {
            name_row_respository.insert_one(&row).await.unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_PAGE_SIZE).unwrap();

        // Test
        let repository = registry.get::<NameQueryRepository>();

        // .count()
        assert_eq!(
            usize::try_from(repository.count().unwrap()).unwrap(),
            queries.len()
        );

        // .all, no pagenation (default)
        assert_eq!(repository.all(&None).unwrap().len(), default_page_size);

        // .all, pagenation (offset 10)
        let result = repository
            .all(&Some(Pagination {
                offset: Some(10),
                first: None,
            }))
            .unwrap();
        assert_eq!(result.len(), default_page_size);
        assert_eq!(result[0], queries[10]);
        assert_eq!(
            result[default_page_size - 1],
            queries[10 + default_page_size - 1]
        );

        // .all, pagenation (first 10)
        let result = repository
            .all(&Some(Pagination {
                offset: None,
                first: Some(10),
            }))
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!(*result.last().unwrap(), queries[9]);

        // .all, pagenation (offset 150, first 90) <- more then records in table
        let result = repository
            .all(&Some(Pagination {
                offset: Some(150),
                first: Some(90),
            }))
            .unwrap();
        assert_eq!(result.len(), queries.len() - 150);
        assert_eq!(result.last().unwrap(), queries.last().unwrap());
    }

    // TODO need to test name_store_join, but it also requires 'store' records to be add and name_store_join helpers
    // which i think might be too much for this test ? Ideally we would have a database snapshot to load in tests
    // I've tested locally with graphIQL, seems to work (apart from diesel bug mentioned above)
}
