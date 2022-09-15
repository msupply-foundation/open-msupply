use std::{future::Future, time::Duration};
use tokio::task::JoinSet;

const PROCESSOR_DELAY_MILLISECONDS: u64 = 300;

pub(crate) async fn delay_for_processor() {
    tokio::time::sleep(Duration::from_millis(PROCESSOR_DELAY_MILLISECONDS)).await
}

pub(crate) async fn exec_concurrent<C, T, Fut, F>(
    context: C,
    number_of_instances: u32,
    operation: F,
) where
    Fut: Future<Output = T> + Send + 'static,
    F: Fn(u32, C) -> Fut,
    C: Clone,
    T: Send + 'static,
{
    let mut set = JoinSet::new();
    for i in 0..number_of_instances {
        let context_clone = context.clone();
        set.spawn(operation(i, context_clone));
    }
    while let Some(result) = set.join_next().await {
        result.unwrap();
    }
}

mod test_exec_concurrent {
    use super::exec_concurrent;
    use log::info;
    use std::time::Duration;
    use std::time::SystemTime;
    use tokio::time;

    // Test to demonstrate how exec_concurrent is used, also to show the difference between `test` runtimes
    // conclusion: I couldn't see any performance difference but would suggest using tokio with worker thread for
    // test that are testing concurrency, you can see that finish order is random for multiple worker thread vs single thread
    // which shows that if there is a problem with concurrency, it is more likely that multi worker thread would catch it
    // rathern then single thread

    async fn test(identifier: &'static str) {
        let now = SystemTime::now();
        exec_concurrent((now, identifier), 5, |i, (now, identifier)| async move {
            info!(
                "{} started {} - micros ({})",
                identifier,
                i,
                now.elapsed().unwrap().as_micros()
            );
            time::sleep(Duration::from_millis(10)).await;
            info!(
                "{} finished {} - micros ({})",
                identifier,
                i,
                now.elapsed().unwrap().as_micros()
            );
        })
        .await;
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_joinset_multithread() {
        // util::init_logger(util::LogLevel::Info);
        test("multithread").await;
        // multithread started 0 - micros (85)
        // multithread started 2 - micros (98)
        // multithread started 3 - micros (107)
        // multithread started 1 - micros (92)
        // multithread started 4 - micros (108)
        // multithread finished 4 - micros (12214)
        // multithread finished 2 - micros (12222)
        // multithread finished 1 - micros (12271)
        // multithread finished 0 - micros (12261)
        // multithread finished 3 - micros (12266)
    }

    #[actix_rt::test]
    async fn test_joinset_singlethread() {
        // util::init_logger(util::LogLevel::Info);
        test("singlethread").await;
        // singlethread started 0 - micros (108)
        // singlethread started 1 - micros (130)
        // singlethread started 2 - micros (134)
        // singlethread started 3 - micros (137)
        // singlethread started 4 - micros (140)
        // singlethread finished 0 - micros (12204)
        // singlethread finished 1 - micros (12242)
        // singlethread finished 2 - micros (12247)
        // singlethread finished 3 - micros (12251)
        // singlethread finished 4 - micros (12254)
    }
}
