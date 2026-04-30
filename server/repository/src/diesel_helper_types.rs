use diesel::prelude::*;

#[derive(QueryableByName, Debug)]
pub struct Count {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub count: i64,
}
