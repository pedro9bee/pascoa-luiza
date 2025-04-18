#!/bin/bash

# Script para manter o servidor de vídeo rodando no Mac
# Mesmo quando você fechar o terminal ou fizer logout

# Verificar argumentos
if [ -z "$1" ]; then
  echo -e "\n❌ Erro: Arquivo de vídeo não especificado"
  echo -e "\nUso: ./run-on-mac.sh /caminho/para/arquivo.mp4 [mensagem personalizada]"
  echo -e "Exemplo: ./run-on-mac.sh ~/Videos/pascoa.mp4 \"Feliz Páscoa, filha! Com amor, papai.\"\n"
  exit 1
fi

# Obter caminho completo do vídeo
VIDEO_PATH=$(realpath "$1")

# Mensagem personalizada (opcional)
MESSAGE="$2"

# Verificar se o arquivo existe
if [ ! -f "$VIDEO_PATH" ]; then
  echo -e "\n❌ Erro: O arquivo '$VIDEO_PATH' não foi encontrado"
  exit 1
fi

# Diretório onde o script está
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

# Verificar se as dependências estão instaladas
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale com 'brew install node'"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale o Node.js completo com 'brew install node'"
    exit 1
fi

if ! command -v cloudflared &> /dev/null; then
    echo "❌ Cloudflared não encontrado. Por favor, instale com 'brew install cloudflared'"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Nome do arquivo de log
LOG_FILE="./video_server.log"

# Verificar se já existe um servidor rodando
if pgrep -f "node video-share-stats.js" > /dev/null; then
    echo "⚠️ Servidor já está rodando. Deseja reiniciar? (s/n)"
    read -r answer
    if [[ "$answer" == "s" ]]; then
        echo "🔄 Reiniciando servidor..."
        pkill -f "node video-share-stats.js"
        pkill -f "cloudflared tunnel"
        sleep 2
    else
        echo "✅ Mantendo servidor atual."
        exit 0
    fi
fi

# Criar um arquivo LaunchAgent para manter o servidor rodando após o logout
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENTS_DIR/com.video.share.plist"

if [ ! -d "$LAUNCH_AGENTS_DIR" ]; then
    mkdir -p "$LAUNCH_AGENTS_DIR"
fi

# Função para criar o LaunchAgent
create_launch_agent() {
    echo "📝 Criando Launch