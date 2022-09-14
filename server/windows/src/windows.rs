/// Creates the entry points and event handling to manage running the server
// under a windows service context
// use server::{configuration, logging_init};
// use service::settings::Settings;
use log::info;
use server::{configuration, logging_init, start_server};
use service::settings::Settings;
use std::{ffi::OsString, time::Duration};
use tokio::sync::mpsc;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    Result,
};

const SERVICE_NAME: &str = "omsupply_server";
const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

// Generate the windows service boilerplate.
// The boilerplate contains the low-level service entry function (ffi_service_main) that parses
// incoming service arguments into Vec<OsString> and passes them to user defined service entry.
define_windows_service!(ffi_service_main, omsupply_service_main);

// #[cfg(not(windows))]
fn main() {
    panic!("This program is only intended to run in a service context.");
}

#[cfg(windows)]
// pub fn main() -> Result<()> {
//     let settings: Settings =
//     configuration::get_configuration().expect("Failed to parse configuration settings");
//     logging_init(settings.logging.clone());

//     log::info!("Starting service");

//     // Register generated `ffi_service_main` with the system and start the service, blocking
//     // this thread until the service is stopped.
//     service_dispatcher::start(SERVICE_NAME, ffi_service_main)
// }

// Service entry function which is called on background thread by the system with service
// parameters. There is no stdout or stderr at this point so make sure to configure the log
// output to file if needed.
pub fn omsupply_service_main(_arguments: Vec<OsString>) {
    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");
    logging_init(settings.logging.clone());

    log::info!("Starting service");

    if let Err(_e) = futures::executor::block_on(run_service()) {
        log::error!("Unable to start service");
    }
}

pub async fn run_service() -> Result<()> {
    // let (shutdown_tx, shutdown_rx) = mpsc::channel();
    let (shutdown_tx, shutdown_rx) = mpsc::channel(1);

    // Define system service event handler that will be receiving service events.
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            // Notifies a service to report its current status information to the service
            // control manager. Always return NoError even if not implemented.
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,

            // Handle stop
            ServiceControl::Stop => {
                futures::executor::block_on(shutdown_tx.send(()));
                // shutdown_tx.send(()).await;
                ServiceControlHandlerResult::NoError
            }

            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    // Register system service event handler.
    // The returned status handle should be used to report service status changes to the system.
    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

    // Tell the system that service is running
    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    info!("Service started");
    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");
    // let server: dyn futures::Future<Output = Result<()>> = async {
    // start_server(settings, shutdown_rx).await;

    // Tell the system that service has stopped.
    // status_handle.set_service_status(ServiceStatus {
    //     service_type: SERVICE_TYPE,
    //     current_state: ServiceState::Stopped,
    //     controls_accepted: ServiceControlAccept::empty(),
    //     exit_code: ServiceExitCode::Win32(0),
    //     checkpoint: 0,
    //     wait_hint: Duration::default(),
    //     process_id: None,
    // })?;

    //     Ok(())
    // };
    // futures::executor::block_on(server);

    // // Tell the system that service has stopped.
    // status_handle.set_service_status(ServiceStatus {
    //     service_type: SERVICE_TYPE,
    //     current_state: ServiceState::Stopped,
    //     controls_accepted: ServiceControlAccept::empty(),
    //     exit_code: ServiceExitCode::Win32(0),
    //     checkpoint: 0,
    //     wait_hint: Duration::default(),
    //     process_id: None,
    // })?;

    Ok(())
}
// }
