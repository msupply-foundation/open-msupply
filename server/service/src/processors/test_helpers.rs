use std::time::Duration;

const PROCESSOR_DELAY_MILLISECONDS: u64 = 300;

pub(crate) async fn delay_for_processor() {
    tokio::time::sleep(Duration::from_millis(PROCESSOR_DELAY_MILLISECONDS)).await
}
