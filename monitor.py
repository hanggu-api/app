import os
import re
import shutil
import zipfile
import threading
import difflib
import requests
import customtkinter as ctk
import google.generativeai as genai
from tkinter import filedialog, messagebox
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from plyer import notification

# --- CONFIGURAÇÃO DA IA ---
API_KEY = "AIzaSyA-owcoq9C6qePLdY7VCJEvN-91wezyNGo"
genai.configure(api_key=API_KEY)
MODELO = genai.GenerativeModel('gemini-1.5-flash')

# --- CLASSE DE MONITORIZAÇÃO (WATCHDOG) ---
class MudancaHandler(FileSystemEventHandler):
    def __init__(self, app_instance):
        self.app = app_instance
        self.cache_codigo = {}

    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith(".dart"):
            return
        
        caminho = event.src_path
        nome_arq = os.path.basename(caminho)

        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                novo_conteudo = f.readlines()

            if caminho in self.cache_codigo:
                antigo = self.cache_codigo[caminho]
                diff = list(difflib.unified_diff(antigo, novo_conteudo))
                
                if diff:
                    self.app.processar_diff(nome_arq, diff)
            
            self.cache_codigo[caminho] = novo_conteudo
        except Exception as e:
            pass

# --- INTERFACE PRINCIPAL ---
class AutoHealerUltra(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("AI Code Auto-Healer PRO - Monitor Ativo")
        self.geometry("800x700")
        ctk.set_appearance_mode("dark")
        
        # Variáveis de Estado
        self.observer = None
        self.pasta_trabalho = ""

        # UI Layout
        self.setup_ui()

    def setup_ui(self):
        self.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self, text="Guardian AI: Manutenção & Monitorização", font=("Segoe UI", 24, "bold")).pack(pady=20)

        # Botões Principais
        self.frame_btns = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_btns.pack(pady=10)

        self.btn_run = ctk.CTkButton(self.frame_btns, text="🚀 Iniciar Monitor & Reparo", command=self.iniciar, fg_color="#2ecc71", hover_color="#27ae60", width=220, height=45)
        self.btn_run.grid(row=0, column=0, padx=10)

        self.btn_log = ctk.CTkButton(self.frame_btns, text="📜 Ver Logs de Mudanças", command=lambda: self.abrir_arquivo("monitoramento_mudancas.log"), width=220, height=45)
        self.btn_log.grid(row=0, column=1, padx=10)

        # Dashboard de Status
        self.status_frame = ctk.CTkFrame(self)
        self.status_frame.pack(pady=10, padx=20, fill="x")
        
        self.lbl_status = ctk.CTkLabel(self.status_frame, text="Estado: Aguardando...", font=("Consolas", 14))
        self.lbl_status.pack(pady=10)

        # Log Visual
        self.txt_log = ctk.CTkTextbox(self, width=750, height=350, font=("Consolas", 12))
        self.txt_log.pack(pady=10, padx=20)

    # --- LOGICA DE NEGÓCIO ---
    def log_evento(self, msg, tipo="INFO"):
        t = datetime.now().strftime("%H:%M:%S")
        linha = f"[{t}] {tipo}: {msg}\n"
        self.txt_log.insert("end", linha)
        self.txt_log.see("end")
        with open("manutencao_geral.log", "a", encoding="utf-8") as f:
            f.write(linha)

    def abrir_arquivo(self, nome):
        if os.path.exists(nome): os.startfile(nome)
        else: messagebox.showinfo("Aviso", "Arquivo ainda não gerado.")

    def iniciar(self):
        pasta = filedialog.askdirectory()
        if pasta:
            self.pasta_trabalho = pasta
            self.btn_run.configure(state="disabled")
            threading.Thread(target=self.pipeline_manutencao, args=(pasta,), daemon=True).start()

    def pipeline_manutencao(self, pasta):
        # 1. Backup
        self.log_evento("📦 Criando Backup do projeto...")
        self.criar_backup(pasta)

        # 2. Check Backend
        self.verificar_backend(pasta)

        # 3. Auditoria de Dependências
        self.auditar_deps(pasta)

        # 4. Iniciar Monitor em Tempo Real
        self.ativar_watcher(pasta)

        self.lbl_status.configure(text="✅ MONITOR ATIVO - Protegendo Código", text_color="#2ecc71")

    def criar_backup(self, pasta):
        zip_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(pasta):
                for f in files:
                    z.write(os.path.join(root, f), os.path.relpath(os.path.join(root, f), pasta))
        self.log_evento(f"Backup concluído: {zip_name}")

    def verificar_backend(self, pasta):
        self.log_evento("🌐 Testando conexão com Backend...")
        # Simulação de busca de URL (pode ser expandido com Regex)
        url_teste = "http://localhost:3000" 
        try:
            r = requests.get(url_teste, timeout=3)
            self.log_evento(f"Backend Status: {r.status_code}", "SUCCESS")
        except:
            self.log_evento("Backend Offline ou Inacessível", "ALERTA")

    def auditar_deps(self, pasta):
        pubspec = os.path.join(pasta, "pubspec.yaml")
        if os.path.exists(pubspec):
            self.log_evento("📋 Analisando pubspec.yaml...")
            # Aqui chamaria a IA para validar versões

    def ativar_watcher(self, pasta):
        self.handler = MudancaHandler(self)
        self.observer = Observer()
        self.observer.schedule(self.handler, pasta, recursive=True)
        self.observer.start()

    def processar_diff(self, arquivo, diff):
        # Lógica de Notificação e Log Detalhado
        adicoes = len([l for l in diff if l.startswith('+') and not l.startswith('+++')])
        remocoes = len([l for l in diff if l.startswith('-') and not l.startswith('---')])
        
        tipo = "critica" if remocoes > 10 else "normal"
        self.notificar(arquivo, tipo)
        
        with open("monitoramento_mudancas.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- {datetime.now()} | {arquivo} ---\n")
            f.write(f"Adicionadas: {adicoes} | Removidas: {remocoes}\n")

    def notificar(self, arquivo, tipo):
        titulo = "🚨 MUDANÇA CRÍTICA!" if tipo == "critica" else "💻 Código Alterado"
        notification.notify(
            title=titulo,
            message=f"Alteração detetada em: {arquivo}",
            app_name="Guardian AI",
            timeout=4
        )
        self.log_evento(f"Mudança detectada em {arquivo}", "WATCHER")

if __name__ == "__main__":
    app = AutoHealerUltra()
    app.mainloop()