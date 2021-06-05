//! src/services/graphql/context.rs

use crate::utils::database::DatabaseConnection;

impl juniper::Context for DatabaseConnection {}