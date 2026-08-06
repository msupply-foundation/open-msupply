use service::service_provider::ServiceProvider;
use std::sync::Arc;
use std::time::Duration;
use tokio::task::JoinHandle;

pub fn spawn_scheduled_task_runner(
    service_provider: Arc<ServiceProvider>,
    interval_secs: u64,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        scheduled_task_runner(service_provider, interval_secs).await;
    })
}

async fn scheduled_task_runner(service_provider: Arc<ServiceProvider>, interval_secs: u64) {
    let mut interval = actix_web::rt::time::interval(Duration::from_secs(interval_secs));
    let service_context = service_provider.basic_context().unwrap();

    loop {
        interval.tick().await;
        log::debug!("Processing Scheduled Tasks");
        if service_provider.email_service.is_configured() {
            // Any server with mail settings configured sends its own queue
            // (e.g. bug report emails); central additionally queues contact forms
            let send_emails = service_provider
                .email_service
                .send_queued_emails(&service_context);
            match send_emails {
                Ok(num) => {
                    if num > 0 {
                        log::info!("Sent {num} queued emails");
                    }
                }
                Err(error) => log::error!("Error sending queued emails: {error:?}"),
            };
        }
    }
}

