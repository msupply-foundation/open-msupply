use super::{DBType, StorageConnection};
use crate::{
    diesel_extensions::OrderByExtensions,
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            name_store_join, name_store_join::dsl as name_store_join_dsl, name_table,
            name_table::dsl as name_table_dsl,
        },
        NameRow, NameStoreJoinRow,
    },
};
use domain::{
    name::{Name, NameFilter, NameSort, NameSortField},
    Pagination,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

type NameAndNameStoreJoin = (NameRow, Option<NameStoreJoinRow>);

pub struct NameQueryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameQueryRepository { connection }
    }

    pub fn count(&self, filter: Option<NameFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<NameFilter>,
        sort: Option<NameSort>,
    ) -> Result<Vec<Name>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                NameSortField::Name => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(name_table_dsl::name.desc_no_case());
                    } else {
                        query = query.order(name_table_dsl::name.asc_no_case());
                    }
                }
                NameSortField::Code => {
                    if sort.desc.unwrap_or(false) {
                        query = query.order(name_table_dsl::code.desc_no_case());
                    } else {
                        query = query.order(name_table_dsl::code.asc_no_case());
                    }
                }
            }
        } else {
            query = query.order(name_table_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<NameAndNameStoreJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((name_row, name_store_join_row_option): NameAndNameStoreJoin) -> Name {
    let (is_customer, is_supplier) = match name_store_join_row_option {
        Some(name_store_join_row) => (
            name_store_join_row.name_is_customer,
            name_store_join_row.name_is_supplier,
        ),
        None => (false, false),
    };

    Name {
        id: name_row.id,
        name: name_row.name,
        code: name_row.code,
        is_customer,
        is_supplier,
    }
}

type BoxedNameQuery =
    IntoBoxed<'static, LeftJoin<name_table::table, name_store_join::table>, DBType>;

pub fn create_filtered_query(filter: Option<NameFilter>) -> BoxedNameQuery {
    let mut query = name_table_dsl::name_table
        .left_join(name_store_join_dsl::name_store_join)
        .into_boxed();

    if let Some(f) = filter {
        if let Some(value) = f.id {
            if let Some(eq) = value.equal_to {
                query = query.filter(name_table_dsl::id.eq(eq));
            }

            if let Some(equal_any) = value.equal_any {
                query = query.filter(name_table_dsl::id.eq_any(equal_any));
            }
        }

        if let Some(code) = f.code {
            if let Some(eq) = code.equal_to {
                query = query.filter(name_table_dsl::code.eq(eq));
            } else if let Some(like) = code.like {
                query = query.filter(name_table_dsl::code.like(format!("%{}%", like)));
            }
        }
        if let Some(name) = f.name {
            if let Some(eq) = name.equal_to {
                query = query.filter(name_table_dsl::name.eq(eq));
            } else if let Some(like) = &name.like {
                query = query.filter(name_table_dsl::name.like(format!("%{}%", like)));
            }
        }
        if let Some(is_customer) = f.is_customer {
            query = query.filter(name_store_join_dsl::name_is_customer.eq(is_customer));
        }
        if let Some(is_supplier) = f.is_supplier {
            query = query.filter(name_store_join_dsl::name_is_supplier.eq(is_supplier));
        }
    }

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        test_db,
        {
            db_diesel::{NameQueryRepository, NameRepository},
            mock::MockDataInserts,
            schema::NameRow,
        },
    };
    use domain::{
        name::{Name, NameSort, NameSortField},
        Pagination, DEFAULT_LIMIT,
    };
    use std::convert::TryFrom;

    fn data() -> (Vec<NameRow>, Vec<Name>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(NameRow {
                id: format!("id{:05}", index),
                name: format!("name{}", index),
                code: format!("code{}", index),
                is_customer: true,
                is_supplier: true,
            });

            queries.push(Name {
                id: format!("id{:05}", index),
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
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_name_query_repository", MockDataInserts::none()).await;
        let repository = NameQueryRepository::new(&storage_connection);

        let (rows, queries) = data();
        for row in rows {
            NameRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        let default_page_size = usize::try_from(DEFAULT_LIMIT).unwrap();

        // Test

        // .count()
        assert_eq!(
            usize::try_from(repository.count(None).unwrap()).unwrap(),
            queries.len()
        );

        // .query, no pagenation (default)
        assert_eq!(
            repository
                .query(Pagination::new(), None, None)
                .unwrap()
                .len(),
            default_page_size
        );

        // .query, pagenation (offset 10)
        let result = repository
            .query(
                Pagination {
                    offset: 10,
                    limit: DEFAULT_LIMIT,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), default_page_size);
        assert_eq!(result[0], queries[10]);
        assert_eq!(
            result[default_page_size - 1],
            queries[10 + default_page_size - 1]
        );

        // .query, pagenation (first 10)
        let result = repository
            .query(
                Pagination {
                    offset: 0,
                    limit: 10,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!(*result.last().unwrap(), queries[9]);

        // .query, pagenation (offset 150, first 90) <- more then records in table
        let result = repository
            .query(
                Pagination {
                    offset: 150,
                    limit: 90,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), queries.len() - 150);
        assert_eq!(result.last().unwrap(), queries.last().unwrap());
    }

    // TODO need to test name_store_join, but it also requires 'store' records to be add and name_store_join helpers
    // which i think might be too much for this test ? Ideally we would have a database snapshot to load in tests
    // I've tested locally with graphIQL, seems to work

    #[actix_rt::test]
    async fn test_name_query_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_name_query_sort", MockDataInserts::all()).await;
        let repo = NameQueryRepository::new(&connection);

        let mut names = repo.query(Pagination::new(), None, None).unwrap();

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(NameSort {
                    key: NameSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        names.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.name.clone().to_lowercase(),
                sorted[count].name.clone().to_lowercase(),
            );
        }

        let sorted = repo
            .query(
                Pagination::new(),
                None,
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();

        names.sort_by(|b, a| a.code.to_lowercase().cmp(&b.code.to_lowercase()));

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.code.clone().to_lowercase(),
                sorted[count].code.clone().to_lowercase(),
            );
        }
    }
}
