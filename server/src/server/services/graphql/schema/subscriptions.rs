use crate::database::connection::DatabaseConnection;

pub type Subscriptions = juniper::EmptySubscription<DatabaseConnection>;
