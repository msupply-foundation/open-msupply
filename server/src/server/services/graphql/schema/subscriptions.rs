//! src/services/graphql/subscriptions.rs

use crate::database::DatabaseConnection;

pub type Subscriptions = juniper::EmptySubscription<DatabaseConnection>;
