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
    echo "📝 Criando LaunchAgent para manter o servidor rodando..."
    
    # Preparar argumentos
    if [ -z "$MESSAGE" ]; then
        ARGS="\"$VIDEO_PATH\""
    else
        ARGS="\"$VIDEO_PATH\" \"$MESSAGE\""
    fi
    
    # Criar o arquivo plist
    cat > "$PLIST_FILE" << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.video.share</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${SCRIPT_DIR}/video-share-stats.js</string>
        <string>${VIDEO_PATH}</string>
EOL

    # Adicionar mensagem se existir
    if [ ! -z "$MESSAGE" ]; then
        cat >> "$PLIST_FILE" << EOL
        <string>${MESSAGE}</string>
EOL
    fi

    # Completar o arquivo plist
    cat >> "$PLIST_FILE" << EOL
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/video_server.log</string>
    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/video_server_error.log</string>
</dict>
</plist>
EOL

    # Carregar o LaunchAgent
    launchctl load "$PLIST_FILE"
    echo "✅ LaunchAgent criado e carregado com sucesso!"
}

# Perguntar se deseja manter o servidor rodando após sair
echo -e "\n🔄 Como você deseja executar o servidor?"
echo "1) Executar no terminal atual (encerra quando fechar o terminal)"
echo "2) Executar em segundo plano (continua mesmo após fechar o terminal)"
echo -n "Escolha (1/2): "
read -r choice

if [[ "$choice" == "2" ]]; then
    create_launch_agent
    echo -e "\n🚀 Servidor iniciado em segundo plano!"
    echo "📊 Para ver os logs: tail -f $LOG_FILE"
    echo "⏹️  Para parar o servidor: launchctl unload $PLIST_FILE"
    echo -e "\n⏳ Aguarde um momento enquanto o servidor inicia..."
    sleep 5
    # Mostrar as primeiras linhas do log para ver a URL
    if [ -f "$SCRIPT_DIR/video_server.log" ]; then
        echo -e "\n📋 Últimas linhas do log:"
        tail -20 "$SCRIPT_DIR/video_server.log" | grep -A 10 "URL para assistir"
    fi
else
    # Executar normalmente no terminal
    echo -e "\n🚀 Iniciando servidor no terminal atual..."
    node video-share-stats.js "$VIDEO_PATH" "$MESSAGE"
fi