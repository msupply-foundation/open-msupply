use service::{service_provider::ServiceProvider, sync::CentralServerConfig};
use std::{sync::Arc, time::Duration};
use tokio::task::JoinHandle;
use util::format_error;

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

    loop {
        interval.tick().await;
        log::debug!("Processing Scheduled Tasks");
        if CentralServerConfig::is_central_server() {
            let service_context = match service_provider.basic_context() {
                Ok(service_context) => service_context,
                Err(error) => {
                    log::error!(
                        "Scheduled task runner: unable to create DB context: {}",
                        format_error(&error)
                    );
                    continue;
                }
            };

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
