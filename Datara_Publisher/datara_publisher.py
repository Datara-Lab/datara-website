from __future__ import annotations

import json
import os
import queue
import subprocess
import threading
import webbrowser
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk


APP_NAME = "Datara Publisher"
DEFAULT_REPO = r"C:\Users\augde\OneDrive\Documentos\datara-website"
CONFIG_FILE = Path(__file__).with_name("publisher_config.json")


def load_config() -> dict:
    default = {
        "repository_path": DEFAULT_REPO,
        "branch": "main",
        "remote": "origin",
        "site_url": "https://datara-lab.com",
        "github_url": "https://github.com/Datara-Lab/datara-website",
        "cloudflare_url": "https://dash.cloudflare.com/",
        "open_site_after_publish": False,
    }

    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(
            json.dumps(default, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return default

    try:
        saved = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        default.update(saved)
    except (OSError, json.JSONDecodeError):
        pass

    return default


CONFIG = load_config()


class DataraPublisher(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(APP_NAME)
        self.geometry("900x620")
        self.minsize(780, 540)

        self.repo = Path(CONFIG["repository_path"])
        self.output_queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self.busy = False

        self._build_ui()
        self.after(100, self._process_queue)
        self.after(250, self.check_status)

    def _build_ui(self) -> None:
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        header = ttk.Frame(self, padding=(24, 20, 24, 12))
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(1, weight=1)

        logo_path = self.repo / "public" / "logos" / "lab-icon.png"
        self.logo_image = None
        if logo_path.exists():
            try:
                self.logo_image = tk.PhotoImage(file=str(logo_path))
                max_size = 64
                factor = max(
                    1,
                    self.logo_image.width() // max_size,
                    self.logo_image.height() // max_size,
                )
                if factor > 1:
                    self.logo_image = self.logo_image.subsample(factor, factor)
                ttk.Label(header, image=self.logo_image).grid(
                    row=0, column=0, rowspan=2, padx=(0, 16)
                )
            except tk.TclError:
                pass

        ttk.Label(
            header,
            text="Datara Publisher",
            font=("Segoe UI", 24, "bold"),
        ).grid(row=0, column=1, sticky="w")

        ttk.Label(
            header,
            text="Publica el sitio con un clic y consulta el estado del repositorio.",
            font=("Segoe UI", 10),
        ).grid(row=1, column=1, sticky="w", pady=(3, 0))

        status_bar = ttk.Frame(self, padding=(24, 0, 24, 12))
        status_bar.grid(row=1, column=0, sticky="ew")
        status_bar.columnconfigure(1, weight=1)

        ttk.Label(status_bar, text="Repositorio:").grid(row=0, column=0, sticky="w")
        self.repo_label = ttk.Label(
            status_bar,
            text=str(self.repo),
            font=("Segoe UI", 9, "bold"),
        )
        self.repo_label.grid(row=0, column=1, sticky="w", padx=(8, 0))

        self.status_label = ttk.Label(
            status_bar,
            text="Revisando...",
            font=("Segoe UI", 10, "bold"),
        )
        self.status_label.grid(row=0, column=2, sticky="e")

        body = ttk.Frame(self, padding=(24, 0, 24, 18))
        body.grid(row=2, column=0, sticky="nsew")
        body.columnconfigure(1, weight=1)
        body.rowconfigure(0, weight=1)

        actions = ttk.LabelFrame(body, text="Acciones", padding=14)
        actions.grid(row=0, column=0, sticky="ns", padx=(0, 14))

        self.publish_button = ttk.Button(
            actions,
            text="🚀  PUBLICAR SITIO",
            command=self.publish,
            width=25,
        )
        self.publish_button.grid(row=0, column=0, sticky="ew", pady=(0, 10), ipady=9)

        ttk.Button(
            actions,
            text="Revisar estado",
            command=self.check_status,
            width=25,
        ).grid(row=1, column=0, sticky="ew", pady=5, ipady=4)

        ttk.Separator(actions).grid(row=2, column=0, sticky="ew", pady=12)

        ttk.Button(
            actions,
            text="Abrir sitio",
            command=lambda: webbrowser.open(CONFIG["site_url"]),
            width=25,
        ).grid(row=3, column=0, sticky="ew", pady=5)

        ttk.Button(
            actions,
            text="Abrir GitHub",
            command=lambda: webbrowser.open(CONFIG["github_url"]),
            width=25,
        ).grid(row=4, column=0, sticky="ew", pady=5)

        ttk.Button(
            actions,
            text="Abrir Cloudflare",
            command=lambda: webbrowser.open(CONFIG["cloudflare_url"]),
            width=25,
        ).grid(row=5, column=0, sticky="ew", pady=5)

        ttk.Separator(actions).grid(row=6, column=0, sticky="ew", pady=12)

        ttk.Button(
            actions,
            text="Limpiar consola",
            command=self.clear_console,
            width=25,
        ).grid(row=7, column=0, sticky="ew", pady=5)

        console_frame = ttk.LabelFrame(body, text="Actividad", padding=10)
        console_frame.grid(row=0, column=1, sticky="nsew")
        console_frame.columnconfigure(0, weight=1)
        console_frame.rowconfigure(0, weight=1)

        self.console = tk.Text(
            console_frame,
            wrap="word",
            state="disabled",
            font=("Consolas", 10),
            padx=10,
            pady=10,
        )
        self.console.grid(row=0, column=0, sticky="nsew")

        scrollbar = ttk.Scrollbar(
            console_frame,
            orient="vertical",
            command=self.console.yview,
        )
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.console.configure(yscrollcommand=scrollbar.set)

        footer = ttk.Frame(self, padding=(24, 0, 24, 16))
        footer.grid(row=3, column=0, sticky="ew")
        footer.columnconfigure(0, weight=1)

        self.progress = ttk.Progressbar(footer, mode="indeterminate")
        self.progress.grid(row=0, column=0, sticky="ew", padx=(0, 12))

        self.footer_label = ttk.Label(footer, text="Listo")
        self.footer_label.grid(row=0, column=1, sticky="e")

    def log(self, text: str) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.console.configure(state="normal")
        self.console.insert("end", f"[{timestamp}] {text}\n")
        self.console.see("end")
        self.console.configure(state="disabled")

    def clear_console(self) -> None:
        self.console.configure(state="normal")
        self.console.delete("1.0", "end")
        self.console.configure(state="disabled")

    def set_busy(self, value: bool, text: str = "") -> None:
        self.busy = value
        self.publish_button.configure(state="disabled" if value else "normal")
        self.footer_label.configure(text=text or ("Procesando..." if value else "Listo"))

        if value:
            self.progress.start(10)
        else:
            self.progress.stop()

    def _run_git(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        command = ["git", *args]
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

        result = subprocess.run(
            command,
            cwd=self.repo,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=creationflags,
        )

        if check and result.returncode != 0:
            error = result.stderr.strip() or result.stdout.strip()
            raise RuntimeError(error or f"Falló: {' '.join(command)}")

        return result

    def _validate_environment(self) -> None:
        if not self.repo.exists():
            raise RuntimeError(f"No existe la carpeta:\n{self.repo}")

        if not (self.repo / ".git").exists():
            raise RuntimeError(f"La carpeta no es un repositorio Git:\n{self.repo}")

        try:
            subprocess.run(
                ["git", "--version"],
                capture_output=True,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except (OSError, subprocess.CalledProcessError) as exc:
            raise RuntimeError("Git no está instalado o no está disponible en PATH.") from exc

    def _get_changes(self) -> list[str]:
        result = self._run_git("status", "--porcelain")
        return [line for line in result.stdout.splitlines() if line.strip()]

    @staticmethod
    def _clean_filename(status_line: str) -> str:
        filename = status_line[3:].strip()
        if " -> " in filename:
            filename = filename.split(" -> ", 1)[1]
        return Path(filename.strip('"')).name

    def _make_commit_message(self, changes: list[str]) -> str:
        names: list[str] = []
        for line in changes:
            name = self._clean_filename(line)
            if name and name not in names:
                names.append(name)

        date_text = datetime.now().strftime("%Y-%m-%d %H:%M")
        if not names:
            return f"Auto deploy | {date_text}"

        visible = names[:4]
        file_text = ", ".join(visible)
        remaining = len(names) - len(visible)

        if remaining > 0:
            file_text += f" y {remaining} archivo{'s' if remaining != 1 else ''} más"

        return f"Auto deploy: {file_text} | {date_text}"

    def check_status(self) -> None:
        if self.busy:
            return

        def task() -> None:
            try:
                self._validate_environment()
                branch = self._run_git("branch", "--show-current").stdout.strip()
                changes = self._get_changes()

                self.output_queue.put(("status", f"Rama {branch} · {len(changes)} cambio(s)"))
                if changes:
                    self.output_queue.put(("log", "Cambios detectados:"))
                    for line in changes:
                        self.output_queue.put(("log", f"  {line}"))
                else:
                    self.output_queue.put(("log", "No hay cambios pendientes."))
            except Exception as exc:
                self.output_queue.put(("error", str(exc)))

        threading.Thread(target=task, daemon=True).start()

    def publish(self) -> None:
        if self.busy:
            return

        self.set_busy(True, "Publicando...")
        self.log("Iniciando publicación...")

        def task() -> None:
            try:
                self._validate_environment()

                changes = self._get_changes()
                if not changes:
                    self.output_queue.put(("nothing", "No hay cambios pendientes para publicar."))
                    return

                commit_message = self._make_commit_message(changes)
                self.output_queue.put(("log", f"Mensaje automático: {commit_message}"))

                self.output_queue.put(("log", "Preparando archivos..."))
                self._run_git("add", "-A")

                self.output_queue.put(("log", "Creando commit..."))
                self._run_git("commit", "-m", commit_message)

                remote = CONFIG["remote"]
                branch = CONFIG["branch"]
                self.output_queue.put(("log", f"Subiendo a {remote}/{branch}..."))
                push = self._run_git("push", remote, branch)

                push_text = (push.stdout + "\n" + push.stderr).strip()
                if push_text:
                    for line in push_text.splitlines():
                        self.output_queue.put(("log", line))

                self.output_queue.put(
                    ("success", "Cambios publicados. Cloudflare iniciará el despliegue automático.")
                )
            except Exception as exc:
                self.output_queue.put(("error", str(exc)))

        threading.Thread(target=task, daemon=True).start()

    def _process_queue(self) -> None:
        try:
            while True:
                event, value = self.output_queue.get_nowait()

                if event == "log":
                    self.log(value)

                elif event == "status":
                    self.status_label.configure(text=value)

                elif event == "success":
                    self.log(value)
                    self.status_label.configure(text="Publicado correctamente")
                    self.set_busy(False, "Publicación completada")
                    messagebox.showinfo(APP_NAME, value)
                    if CONFIG.get("open_site_after_publish"):
                        webbrowser.open(CONFIG["site_url"])

                elif event == "nothing":
                    self.log(value)
                    self.set_busy(False, "Sin cambios")
                    messagebox.showinfo(APP_NAME, value)

                elif event == "error":
                    self.log(f"ERROR: {value}")
                    self.status_label.configure(text="Se produjo un error")
                    self.set_busy(False, "Error")
                    messagebox.showerror(APP_NAME, value)

        except queue.Empty:
            pass

        self.after(100, self._process_queue)


if __name__ == "__main__":
    app = DataraPublisher()
    app.mainloop()
