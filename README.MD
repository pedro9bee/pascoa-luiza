# Instruções para o Video-Share-Debug.js

Este script aprimorado resolve problemas com o Cloudflare Tunnel e adiciona logs de depuração para ajudar a identificar o que está acontecendo quando o túnel trava.

## Pré-requisitos

- Node.js (versão 14+)
- Cloudflared instalado
- As dependências do projeto original

## Instalação

1. Salve o arquivo `video-share-debug.js` no mesmo diretório do projeto original

2. Verifique se as dependências estão instaladas:
   ```bash
   npm install
   ```

## Uso

Execute o script passando o caminho do vídeo e, opcionalmente, uma mensagem personalizada:

```bash
node video-share-debug.js /caminho/para/seu/video.mp4 "Feliz Páscoa, filha! Estou com saudades, te amo muito!"
```

## Novos recursos de depuração

Este script aprimorado inclui:

1. **Logs detalhados**: Mostra exatamente o que está acontecendo com o processo do Cloudflared
2. **Detecção de falhas**: Identifica quando o túnel Cloudflare trava
3. **Método alternativo de túnel**: Tenta um método diferente se o padrão falhar
4. **Melhor encerramento de processos**: Garante que todos os processos sejam encerrados corretamente
5. **Tratamento de erros aprimorado**: Captura e registra erros para ajudar na solução de problemas
6. **Timeout com sugestões**: Se não conseguir URL em 60 segundos, mostra sugestões úteis

## Solucionando problemas comuns do Cloudflared

Se o túnel continuar travando:

1. **Verifique a versão do Cloudflared**:
   ```bash
   cloudflared --version
   ```
   Atualize para a versão mais recente se necessário.

2. **Execute o Cloudflared manualmente para ver mensagens de erro**:
   ```bash
   cloudflared tunnel --url http://localhost:3000 --verbose
   ```

3. **Verifique sua conexão de internet**:
   Certifique-se de que sua conexão seja estável e que não esteja atrás de um firewall restritivo.

4. **Verifique se há processos do Cloudflared travados**:
   ```bash
   # No Linux/Mac
   ps aux | grep cloudflared
   
   # No Windows
   tasklist | findstr cloudflared
   ```
   
   Se encontrar processos antigos, encerre-os:
   ```bash
   # Linux/Mac
   pkill -f cloudflared
   
   # Windows
   taskkill /F /IM cloudflared.exe
   ```

5. **Alternativa: Use o método alternativo diretamente**:
   ```bash
   node video-share-debug.js /caminho/do/seu/video.mp4 "Sua mensagem" --alt-tunnel
   ```

## Entendendo os logs de depuração

O script gera logs com prefixo `[DEBUG]` que mostram:

- Inicialização e configuração do servidor
- Tentativas de conexão do Cloudflared
- Atividade do cliente (visualizações, pausas, etc.)
- Erros e exceções

Se precisar compartilhar esses logs para obter ajuda, você pode redirecioná-los para um arquivo:

```bash
node video-share-debug.js /caminho/do/seu/video.mp4 "Sua mensagem" > debug_log.txt 2>&1
```

## Considerações de segurança

- O script expõe uma porta local (3000) para a internet através do Cloudflare
- A URL gerada é temporária e válida apenas enquanto o script estiver em execução
- As estatísticas de acesso são armazenadas localmente em `stats/access_stats.json`