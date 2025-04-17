# Compartilhar Vídeo de Páscoa - Modo Simples

Este projeto oferece uma maneira super simples de compartilhar um vídeo de Páscoa com sua filha no Brasil usando apenas um comando no terminal.

## Versão Shell Script (Mais Simples)

### Pré-requisitos

- Python 3 (já vem instalado na maioria dos sistemas Linux/Mac)
- Cloudflared (para criar o túnel)
- qrencode (opcional, para gerar QR Code no terminal)

### Instalação

1. Instale cloudflared:
   ```bash
   # Ubuntu/Debian
   sudo apt install cloudflared
   
   # macOS
   brew install cloudflared
   ```

2. Instale qrencode (opcional, para QR Code):
   ```bash
   sudo apt install qrencode   # Ubuntu/Debian
   brew install qrencode       # macOS
   ```

3. Baixe o script e torne-o executável:
   ```bash
   chmod +x compartilhar-video.sh
   ```

### Uso

Execute o script passando o caminho do vídeo e, opcionalmente, uma mensagem personalizada:

```bash
./compartilhar-video.sh /caminho/para/seu/video.mp4 "Feliz Páscoa, filha! Estou com saudades, te amo muito!"
```

O script vai:
1. Iniciar um servidor local com o vídeo
2. Criar um túnel Cloudflare para expor o servidor à internet
3. Gerar uma URL e um QR Code para compartilhar

## Versão Node.js (Alternativa)

Se preferir usar Node.js, também criamos uma versão que oferece as mesmas funcionalidades.

### Pré-requisitos

- Node.js (versão 14+)
- Cloudflared (para criar o túnel)
- npm (gerenciador de pacotes do Node.js)

### Instalação

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Instale cloudflared conforme as instruções acima.

### Uso

```bash
node video-share.js /caminho/para/seu/video.mp4 "Sua mensagem personalizada aqui"
```

## Como funciona

1. O script inicia um servidor web simples na sua máquina
2. O Cloudflare Tunnel cria um túnel seguro da internet para sua máquina local
3. Você recebe uma URL e um QR Code que pode compartilhar
4. Quando sua filha acessar o link, ela verá uma página bonita com tema de Páscoa contendo sua mensagem e o vídeo

## Notas importantes

- O link funciona apenas enquanto o script estiver rodando no seu computador
- Seu computador precisa estar ligado e conectado à internet enquanto sua filha estiver assistindo ao vídeo
- A URL gerada pelo Cloudflare é temporária e muda cada vez que você inicia o script
- Esta solução é gratuita e não requer nenhum cadastro ou configuração adicional

## Solução de problemas

- **URL não é gerada**: Verifique se o cloudflared está instalado corretamente.
- **Vídeo não carrega**: Certifique-se de que o formato do vídeo é compatível com navegadores (MP4 é recomendado).
- **Erro de permissão**: Verifique se o script tem permissão de execução (`chmod +x compartilhar-video.sh`).# pascoa-luiza
