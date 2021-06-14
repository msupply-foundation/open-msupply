use crate::database::DatabaseConnection;

pub type Subscriptions = juniper::EmptySubscription<DatabaseConnection>;
