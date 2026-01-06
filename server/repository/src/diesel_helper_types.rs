use diesel::prelude::*;


#[cfg(not(feature = "postgres"))]
#[derive(QueryableByName, Debug)]
pub struct Count {
    #[diesel(sql_type = diesel::sql_types::Integer)]
    pub count: i32,
}

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug)]
pub struct Count {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    pub count: i64,
}