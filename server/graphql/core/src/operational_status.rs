#[derive(Clone)]
pub enum OperationalStatus {
    Operational,
    MigratingDatabase,
    Initialising,
}
