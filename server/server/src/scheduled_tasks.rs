use service::{service_provider::ServiceProvider, sync::CentralServerConfig};
use std::{sync::Arc, time::Duration};
use tokio::task::JoinHandle;

pub fn spawn_scheduled_task_runner(
    service_provider: Arc<ServiceProvider>,
    interval_secs: u64,
) -> JoinHandle<()> {
    let period: Duration = Duration::from_secs(interval_secs);

    tokio::spawn(async move {
        scheduled_task_runner(service_provider, period).await;
    })
}

async fn scheduled_task_runner(service_provider: Arc<ServiceProvider>, period: Duration) {
    let mut interval = actix_web::rt::time::interval(period);
    let service_context = service_provider.basic_context().unwrap();

    loop {
        interval.tick().await;
        log::debug!("Processing Scheduled Tasks");
        if CentralServerConfig::is_central_server() {
            // Email sending is only supported on the central server
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
}
