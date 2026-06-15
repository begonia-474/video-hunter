use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Manager, RunEvent};

struct BackendProcess(Mutex<Option<Child>>);
struct BackendLog(Arc<Mutex<Vec<String>>>);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn reveal_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        std::process::Command::new("xdg-open")
            .arg(&parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_backend_logs(log: tauri::State<'_, BackendLog>) -> Vec<String> {
    let buf = log.0.lock().unwrap();
    buf.clone()
}

fn start_backend(app: &tauri::App) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;

    #[cfg(target_os = "windows")]
    let bin_name = "video-hunter-backend.exe";
    #[cfg(not(target_os = "windows"))]
    let bin_name = "video-hunter-backend";

    let backend_path = exe_dir.join("resources").join("video-hunter-backend").join(bin_name);

    let backend_path = if backend_path.exists() {
        backend_path
    } else {
        let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
        let alt_path = resource_dir.join("video-hunter-backend").join(bin_name);
        if alt_path.exists() {
            alt_path
        } else {
            return Err(format!("Backend not found. Tried:\n  {}\n  {}", backend_path.display(), alt_path.display()));
        }
    };

    let backend_dir = backend_path.parent().unwrap_or(exe_dir);

    let data_dir = backend_dir.join("data");
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }

    let mut cmd = Command::new(&backend_path);
    cmd.current_dir(backend_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;

    // Capture stdout into shared buffer
    if let Some(stdout) = child.stdout.take() {
        let log_buf = app.state::<BackendLog>().0.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let mut buf = log_buf.lock().unwrap();
                        buf.push(line);
                        if buf.len() > 2000 {
                            buf.drain(0..500);
                        }
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let state = app.state::<BackendProcess>();
    let mut process = state.0.lock().map_err(|e| e.to_string())?;
    *process = Some(child);

    Ok(())
}

fn wait_for_backend() -> bool {
    let timeout = std::time::Duration::from_secs(15);
    let interval = std::time::Duration::from_millis(200);
    let start = std::time::Instant::now();

    while start.elapsed() < timeout {
        if std::net::TcpStream::connect("127.0.0.1:18224").is_ok() {
            return true;
        }
        std::thread::sleep(interval);
    }
    false
}

fn stop_backend(app_handle: &tauri::AppHandle) {
    let state = app_handle.state::<BackendProcess>();
    let mut process = state.0.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref mut child) = *process {
        let _ = child.kill();
        let _ = child.wait();
    }
    *process = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(BackendProcess(Mutex::new(None)))
        .manage(BackendLog(Arc::new(Mutex::new(Vec::new()))))
        .setup(|app| {
            if let Err(e) = start_backend(app) {
                eprintln!("Failed to start backend: {}", e);
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_dialog::DialogExt;
                    handle.dialog()
                        .message(format!("后端启动失败：{}\n\n应用可能无法正常工作。", e))
                        .title("Video Hunter")
                        .show(|_| {});
                });
                return Ok(());
            }

            std::thread::spawn(|| {
                if !wait_for_backend() {
                    eprintln!("Backend did not become ready within 15 seconds");
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, open_folder, reveal_in_folder, get_backend_logs])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { .. } => {
                    stop_backend(app_handle);
                }
                _ => {}
            }
        });
}
