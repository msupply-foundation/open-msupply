use service::service_provider::ServiceProvider;
use std::{sync::Arc, time::Duration};
use tokio::task::JoinHandle;

static TASK_INTERVAL: Duration = Duration::from_secs(10);

pub fn spawn_scheduled_task_runner(service_provider: Arc<ServiceProvider>) -> JoinHandle<()> {
    tokio::spawn(async move {
        scheduled_task_runner(service_provider).await;
    })
}

async fn scheduled_task_runner(service_provider: Arc<ServiceProvider>) {
    let mut interval = actix_web::rt::time::interval(TASK_INTERVAL);
    let service_context = service_provider.basic_context().unwrap();

    loop {
        interval.tick().await;
        log::debug!("Processing Scheduled Tasks");
        let send_emails = service_provider
            .email_service
            .send_queued_emails(&service_context);
        match send_emails {
            Ok(num) => {
                if num > 0 {
                    log::info!("Sent {} queued emails", num);
                }
            }
            Err(error) => log::error!("Error sending queued emails: {:?}", error),
        };
    }
}
