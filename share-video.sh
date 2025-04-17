#!/bin/bash

# Verificar argumentos
if [ -z "$1" ]; then
  echo -e "\n❌ Erro: Arquivo de vídeo não especificado"
  echo -e "\nUso: ./compartilhar-video.sh /caminho/para/arquivo.mp4 [mensagem personalizada]"
  echo -e "Exemplo: ./compartilhar-video.sh ~/Videos/pascoa.mp4 \"Feliz Páscoa, filha! Com amor, papai.\"\n"
  exit 1
fi

# Obter caminho completo do vídeo
VIDEO_PATH=$(realpath "$1")

# Mensagem personalizada (opcional)
MESSAGE="${2:-Feliz Páscoa! Este vídeo especial foi enviado com muito carinho para você!}"

# Verificar se o arquivo existe
if [ ! -f "$VIDEO_PATH" ]; then
  echo -e "\n❌ Erro: O arquivo '$VIDEO_PATH' não foi encontrado"
  exit 1
fi

# Verificar se é um arquivo de vídeo
MIME_TYPE=$(file --mime-type -b "$VIDEO_PATH")
if [[ ! "$MIME_TYPE" == video/* ]]; then
  echo -e "\n❌ Erro: O arquivo não parece ser um vídeo ($MIME_TYPE)"
  echo "Por favor, forneça um arquivo de vídeo (mp4, webm, etc.)"
  exit 1
fi

# Verificar se as dependências estão instaladas
command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 não encontrado. Por favor, instale com: sudo apt install python3"; exit 1; }
command -v cloudflared >/dev/null 2>&1 || { 
  echo -e "\n❌ Cloudflared não encontrado. Por favor, instale com:"
  echo "Ubuntu/Debian: sudo apt install cloudflared"
  echo "MacOS: brew install cloudflared"
  echo "Windows: Baixe de https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
  exit 1
}

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Nome do arquivo de vídeo
VIDEO_FILENAME=$(basename "$VIDEO_PATH")

# Criar arquivo HTML para o player de vídeo
cat > "$TEMP_DIR/index.html" << HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mensagem Especial de Páscoa</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            padding: 20px 0;
            position: relative;
        }
        
        .header h1 {
            color: #e74c3c;
            margin-bottom: 10px;
        }
        
        .message-box {
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .video-container {
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        video {
            max-width: 100%;
            border-radius: 5px;
        }
        
        /* Decorações de Páscoa */
        .easter-decoration {
            position: absolute;
            width: 60px;
            height: 60px;
            background-repeat: no-repeat;
            background-size: contain;
            z-index: -1;
            opacity: 0.7;
        }
        
        .egg1 {
            top: -10px;
            left: 20px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%23FFD54F' d='M32,58c-13.3,0-24-15.1-24-34C8,12.3,18.7,6,32,6s24,6.3,24,18C56,42.9,45.3,58,32,58z'/%3E%3Cpath fill='%23FF7043' d='M31,15c0,0-3,2.3-3,4s1.3,3,3,3s3-1.3,3-3S31,15,31,15z'/%3E%3Cpath fill='%234CAF50' d='M40,24c0,0-4,3.3-4,6s1.8,5,4,5s4-2.3,4-5S40,24,40,24z'/%3E%3Cpath fill='%233F51B5' d='M25,30c0,0-3,2.3-3,4s1.3,3,3,3s3-1.3,3-3S25,30,25,30z'/%3E%3Cpath fill='%23E91E63' d='M32,38c0,0-4,3.3-4,6s1.8,5,4,5s4-2.3,4-5S32,38,32,38z'/%3E%3C/svg%3E");
        }
        
        .egg2 {
            top: 30px;
            right: 20px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%2381D4FA' d='M32,58c-13.3,0-24-15.1-24-34C8,12.3,18.7,6,32,6s24,6.3,24,18C56,42.9,45.3,58,32,58z'/%3E%3Cpath fill='%23FFEB3B' d='M25,18c0,0-2,1.8-2,3s0.9,2,2,2s2-0.8,2-2S25,18,25,18z'/%3E%3Cpath fill='%237E57C2' d='M42,20c0,0-3,2.3-3,4s1.3,3,3,3s3-1.3,3-3S42,20,42,20z'/%3E%3Cpath fill='%23FF5252' d='M24,36c0,0-2,1.8-2,3s0.9,2,2,2s2-0.8,2-2S24,36,24,36z'/%3E%3Cpath fill='%2326A69A' d='M38,40c0,0-2,1.3-2,3s0.9,3,2,3s2-1.3,2-3S38,40,38,40z'/%3E%3C/svg%3E");
        }
        
        .bunny {
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 80px;
            height: 80px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%23ECEFF1' d='M32,62c-8.8,0-16-7.2-16-16V26c0-8.8,7.2-16,16-16s16,7.2,16,16v20C48,54.8,40.8,62,32,62z'/%3E%3Cpath fill='%23FFCDD2' d='M38,42c0,3.3-2.7,6-6,6s-6-2.7-6-6s2.7-6,6-6S38,38.7,38,42z'/%3E%3Cpath fill='%23ECEFF1' d='M24,10c0,0-8-2-10,6s2,10,2,10s-10-2-12,4s4,8,4,8 M40,10c0,0,8-2,10,6s-2,10-2,10s10-2,12,4s-4,8-4,8'/%3E%3Ccircle fill='%23212121' cx='26' cy='36' r='2'/%3E%3Ccircle fill='%23212121' cx='38' cy='36' r='2'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-size: contain;
            animation: hop 5s infinite;
        }
        
        @keyframes hop {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-30px);
            }
            60% {
                transform: translateY(-15px);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="easter-decoration egg1"></div>
            <div class="easter-decoration egg2"></div>
            <h1>Mensagem Especial de Páscoa</h1>
            <p>Alguém tem um vídeo especial para você!</p>
        </div>
        
        <div class="message-box">
            <p>${MESSAGE}</p>
        </div>
        
        <div class="video-container">
            <video controls autoplay>
                <source src="/video" type="${MIME_TYPE}">
                Seu navegador não suporta vídeos HTML5.
            </video>
        </div>
    </div>
    
    <div class="bunny"></div>
</body>
</html>
HTML

# Criar um servidor HTTP simples com Python
cat > "$TEMP_DIR/server.py" << 'PYTHON'
#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

# Obter caminho do vídeo dos argumentos
video_path = sys.argv[1]

# Classe personalizada para o manipulador HTTP
class VideoHandler(http.server.SimpleHTTPRequestHandler):
    # Diretório raiz
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.environ.get('TEMP_DIR', '.'), **kwargs)
    
    def do_GET(self):
        # Servir o vídeo
        if self.path == '/video':
            self.send_response(200)
            self.send_header('Content-type', os.environ.get('MIME_TYPE', 'video/mp4'))
            self.send_header('Content-Length', str(os.path.getsize(video_path)))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            
            with open(video_path, 'rb') as file:
                self.wfile.write(file.read())
            return
        
        # Servir outros arquivos normalmente
        return super().do_GET()

# Configurar e iniciar o servidor
handler = VideoHandler
PORT = 3000

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Servidor rodando na porta {PORT}")
    httpd.serve_forever()
PYTHON

# Tornar o script Python executável
chmod +x "$TEMP_DIR/server.py"

# Exportar variáveis para o script Python
export TEMP_DIR="$TEMP_DIR"
export MIME_TYPE="$MIME_TYPE"

# Iniciar servidor Python em segundo plano
echo -e "\n🚀 Iniciando servidor para o vídeo: $VIDEO_FILENAME"
python3 "$TEMP_DIR/server.py" "$VIDEO_PATH" &
SERVER_PID=$!

# Função para garantir que o servidor seja encerrado ao sair do script
cleanup() {
    echo -e "\n👋 Encerrando servidor e túnel..."
    kill $SERVER_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    exit 0
}

# Configurar trap para capturar Ctrl+C e outras interrupções
trap cleanup SIGINT SIGTERM EXIT

# Aguardar o servidor iniciar
sleep 2

# Iniciar o túnel Cloudflare
echo -e "⏳ Iniciando túnel Cloudflare (aguarde)..."

# Iniciar cloudflared e capturar saída
cloudflared tunnel --url http://localhost:3000 > "$TEMP_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!

# Aguardar a URL do túnel ser gerada
URL=""
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ -z "$URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    URL=$(grep -o 'https://[a-z0-9-]\+\.trycloudflare\.com' "$TEMP_DIR/tunnel.log")
    if [ -z "$URL" ]; then
        sleep 1
        ATTEMPTS=$((ATTEMPTS+1))
    fi
done

if [ -z "$URL" ]; then
    echo -e "\n❌ Não