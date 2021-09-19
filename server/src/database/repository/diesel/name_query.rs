use super::{get_connection, DBBackendConnection};
use crate::{
    database::{
        repository::RepositoryError,
        schema::{diesel_schema::name_table::dsl::*, NameRow},
    },
    server::service::graphql::schema::{
        queries::pagination::{Pagination, PaginationOption},
        types::NameQuery,
    },
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

impl From<NameRow> for NameQuery {
    fn from(name_row: NameRow) -> Self {
        NameQuery {
            id: name_row.id,
            name: name_row.name,
            code: name_row.code,
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
        Ok(name_table.count().get_result(&*connection)?)
    }

    pub fn all(&self, pagination: &Option<Pagination>) -> Result<Vec<NameQuery>, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(name_table
            .offset(pagination.offset())
            .limit(pagination.first())
            .load::<NameRow>(&*connection)?
            .into_iter()
            .map(NameRow::into)
            .collect())
    }
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
}
