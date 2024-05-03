#[allow(dead_code)]
pub(crate) const TEST_OUTPUT_DIR: &str = "test_output";
#[cfg(all(not(feature = "postgres"), not(feature = "memory")))]
#[allow(dead_code)]
pub(crate) const TEMPLATE_MARKER_FILE: &str = "___template_needs_update.marker";
#[cfg(feature = "postgres")]
pub(crate) const TEMPLATE_MARKER_FILE: &'static str = "___template_needs_update_pg.marker";
