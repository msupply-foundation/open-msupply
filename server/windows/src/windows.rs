/// Creates the entry points and event handling to manage running the server
// under a windows service context

#[cfg(windows)]
fn main() -> windows_service::Result<()> {
    omsupply_service::run()
}

#[cfg(not(windows))]
fn main() {
    panic!("This program is only intended to run on Windows.");
}

#[cfg(windows)]
mod omsupply_service {
    use log::{error, info};
    use server::{configuration, logging_init, start_server};
    use service::settings::Settings;
    use std::{
        env::{current_exe, set_current_dir},
        ffi::OsString,
        panic,
        time::Duration,
    };
    use tokio::sync::mpsc;
    use windows_service::{
        define_windows_service,
        service::{
            ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
            ServiceType,
        },
        service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
        service_dispatcher, Result,
    };

    // used internally by the service control handler - the actual service name can differ
    const SERVICE_NAME: &str = "omsupply_server";
    const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

    pub fn run() -> Result<()> {
        // register generated `ffi_service_main` with the system and start the service
        // this thread is blocked until the service is stopped
        service_dispatcher::start(SERVICE_NAME, ffi_service_main)
    }

    // Generate the windows service boilerplate
    define_windows_service!(ffi_service_main, omsupply_service_main);

    // Service entry function which is called on background thread by the system with service
    // parameters. There is no stdout or stderr at this point so make sure to configure the log
    // output to file if needed.
    pub fn omsupply_service_main(_arguments: Vec<OsString>) {
        // the current dir is used by the configuration module to find the config files
        // and also by the logging module for the log file location
        // when run in the service context, the current dir is the windows service directory
        let executable_path = current_exe().unwrap();
        let executable_directory = executable_path.parent().unwrap();
        set_current_dir(&executable_directory).unwrap();
        let settings: Settings =
            configuration::get_configuration().expect("Failed to parse configuration settings");
        logging_init(settings.logging.clone());

        panic::set_hook(Box::new(|panic_info| {
            error!("panic occurred {:?}", panic_info);
        }));

        if let Err(_e) = run_service(settings) {
            error!("Unable to start service");
        }
    }

    fn set_status(
        status_handle: ServiceStatusHandle,
        current_state: ServiceState,
        controls_accepted: ServiceControlAccept,
    ) -> Result<()> {
        status_handle.set_service_status(ServiceStatus {
            service_type: SERVICE_TYPE,
            current_state,
            controls_accepted,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })
    }

    pub fn run_service(settings: Settings) -> Result<()> {
        // Create a channel to be able to poll a stop event from the service worker loop.
        let (shutdown_tx, shutdown_rx) = mpsc::channel(1);

        // Define system service event handler that will be receiving service events.
        let event_handler = move |control_event| -> ServiceControlHandlerResult {
            match control_event {
                // Notifies a service to report its current status information to the service
                // control manager. Always return NoError even if not implemented.
                ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,

                // Handle stop
                ServiceControl::Stop => {
                    // update status to StopPending because actix_web can take a long time to stop
                    // as it has to wait for all threads to stop processing
                    let event_handler = move |_| -> ServiceControlHandlerResult {
                        ServiceControlHandlerResult::NotImplemented
                    };
                    let status_handle =
                        service_control_handler::register(SERVICE_NAME, event_handler).unwrap();
                    let _ = set_status(
                        status_handle,
                        ServiceState::StopPending,
                        ServiceControlAccept::empty(),
                    );

                    let _ = futures::executor::block_on(shutdown_tx.send(()));
                    ServiceControlHandlerResult::NoError
                }

                _ => ServiceControlHandlerResult::NotImplemented,
            }
        };

        // Register system service event handler
        // The returned status handle is used to report service status changes to the system
        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        // the start_server future only completes when the server is stopped
        set_status(
            status_handle,
            ServiceState::Running,
            ServiceControlAccept::STOP,
        )?;

        <::actix_web::rt::System>::new().block_on(async {
            if let Err(e) = start_server(settings, shutdown_rx).await {
                error!("Error! {:#?}", e);
            }
        });

        set_status(
            status_handle,
            ServiceState::Stopped,
            ServiceControlAccept::empty(),
        )?;

        Ok(())
    }
}
