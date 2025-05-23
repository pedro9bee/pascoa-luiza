#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const QRCode = require('qrcode-terminal');
const mime = require('mime-types');

// Configuração de debug
const DEBUG = true;
const debugLog = (message, ...args) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[DEBUG ${timestamp}]`, message, ...args);
  }
};

// Verificar argumentos
if (process.argv.length < 3) {
  console.log('\n❌ Erro: Arquivo de vídeo não especificado');
  console.log('\nUso: node video-share.js /caminho/para/arquivo.mp4 [mensagem personalizada]');
  console.log('Exemplo: node video-share.js ~/Videos/pascoa.mp4 "Feliz Páscoa, filha! Com amor, papai."\n');
  process.exit(1);
}

// Obter caminho do vídeo e mensagem personalizada
const videoPath = path.resolve(process.argv[2]);
const customMessage = process.argv[3] || 'Feliz Páscoa! Este vídeo especial foi enviado com muito carinho para você!';

debugLog('Iniciando com vídeo:', videoPath);
debugLog('Mensagem personalizada:', customMessage);

// Verificar se o arquivo existe
if (!fs.existsSync(videoPath)) {
  console.log(`\n❌ Erro: O arquivo "${videoPath}" não foi encontrado`);
  process.exit(1);
}

// Verificar se é um vídeo
const mimeType = mime.lookup(videoPath);
if (!mimeType || !mimeType.startsWith('video/')) {
  console.log(`\n❌ Erro: O arquivo não parece ser um vídeo (${mimeType || 'tipo desconhecido'})`);
  console.log('Por favor, forneça um arquivo de vídeo (mp4, webm, etc.)');
  process.exit(1);
}

debugLog('Mime type do vídeo:', mimeType);

// Diretório para estatísticas
const statsDir = path.join(process.cwd(), 'stats');
if (!fs.existsSync(statsDir)) {
  fs.mkdirSync(statsDir, { recursive: true });
  debugLog('Criado diretório de estatísticas:', statsDir);
}

// Arquivo de estatísticas
const statsFile = path.join(statsDir, 'access_stats.json');

// Carregar estatísticas existentes ou criar novo objeto
let stats = { 
  videoName: path.basename(videoPath),
  totalViews: 0,
  firstView: null,
  lastView: null,
  viewDuration: [],
  viewDetails: []
};

if (fs.existsSync(statsFile)) {
  try {
    stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    debugLog('Estatísticas carregadas:', { totalViews: stats.totalViews });
  } catch (error) {
    debugLog('Erro ao carregar estatísticas, criando novo arquivo:', error);
  }
}

// Salvar estatísticas em um arquivo
const saveStats = () => {
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  debugLog('Estatísticas salvas');
};

// Iniciar servidor Express
const app = express();
const PORT = 3000;
const videoFileName = path.basename(videoPath);

// Armazenar sessões ativas
const activeSessions = {};

// Página HTML para o player de vídeo com tema de Páscoa e tracking
const playerHtml = `<!DOCTYPE html>
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

        .error-message {
            color: red;
            padding: 10px;
            border: 1px solid red;
            background-color: #fee;
            margin-top: 20px;
            border-radius: 5px;
            display: none;
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
            <p>${customMessage}</p>
        </div>
        
        <div class="video-container">
            <video id="videoPlayer" controls autoplay>
                <source src="/video" type="${mimeType}">
                Seu navegador não suporta vídeos HTML5.
            </video>
            <div id="errorMessage" class="error-message">
                Houve um erro ao carregar o vídeo. Por favor, tente novamente.
            </div>
        </div>
    </div>
    
    <div class="bunny"></div>

    <script>
        // Gerar um ID único para esta sessão
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Registrar início da visualização
        fetch('/track/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                sessionId,
                userAgent: navigator.userAgent,
                language: navigator.language,
                screenSize: \`\${window.screen.width}x\${window.screen.height}\`,
                timestamp: new Date().toISOString()
            }),
        })
        .catch(error => {
            console.error('Erro ao registrar início da visualização:', error);
        });

        // Registrar eventos do vídeo
        const videoPlayer = document.getElementById('videoPlayer');
        const errorMessage = document.getElementById('errorMessage');
        let startTime = new Date();
        let watchDuration = 0;
        let isPlaying = false;
        let heartbeatInterval;

        // Tratamento de erros do vídeo
        videoPlayer.addEventListener('error', () => {
            console.error('Erro ao carregar o vídeo:', videoPlayer.error);
            errorMessage.textContent = 'Erro ao carregar o vídeo: ' + (videoPlayer.error ? videoPlayer.error.message : 'Erro desconhecido');
            errorMessage.style.display = 'block';
            
            // Enviar erro para o servidor
            fetch('/track/error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    sessionId,
                    errorCode: videoPlayer.error ? videoPlayer.error.code : 'unknown',
                    errorMessage: videoPlayer.error ? videoPlayer.error.message : 'Erro desconhecido'
                }),
            }).catch(err => console.error('Erro ao enviar relatório de erro:', err));
        });

        videoPlayer.addEventListener('play', () => {
            isPlaying = true;
            startTime = new Date();
            errorMessage.style.display = 'none';
            
            // Iniciar heartbeat para manter registro de que o usuário está assistindo
            heartbeatInterval = setInterval(() => {
                if (isPlaying) {
                    watchDuration = (new Date() - startTime) / 1000;
                    fetch('/track/heartbeat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            sessionId,
                            duration: watchDuration,
                            progress: videoPlayer.currentTime / videoPlayer.duration
                        }),
                    }).catch(err => console.error('Erro no heartbeat:', err));
                }
            }, 30000); // Heartbeat a cada 30 segundos
        });

        videoPlayer.addEventListener('pause', () => {
            isPlaying = false;
            const pauseTime = new Date();
            watchDuration += (pauseTime - startTime) / 1000;

            fetch('/track/pause', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    sessionId,
                    duration: watchDuration,
                    progress: videoPlayer.currentTime / videoPlayer.duration
                }),
            }).catch(err => console.error('Erro ao registrar pausa:', err));
        });

        videoPlayer.addEventListener('ended', () => {
            isPlaying = false;
            clearInterval(heartbeatInterval);
            const endTime = new Date();
            watchDuration += (endTime - startTime) / 1000;

            fetch('/track/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    sessionId,
                    duration: watchDuration,
                    completed: true
                }),
            }).catch(err => console.error('Erro ao registrar conclusão do vídeo:', err));
        });

        // Registrar quando o usuário sai da página
        window.addEventListener('beforeunload', () => {
            if (isPlaying) {
                const exitTime = new Date();
                watchDuration += (exitTime - startTime) / 1000;
            }
            
            // Usar sendBeacon para garantir que os dados sejam enviados
            navigator.sendBeacon('/track/exit', JSON.stringify({
                sessionId,
                duration: watchDuration,
                progress: videoPlayer.currentTime / videoPlayer.duration
            }));
            
            clearInterval(heartbeatInterval);
        });
    </script>
</body>
</html>
`;

// Middleware para processar JSON
app.use(express.json());

// Rota para a página principal
app.get('/', (req, res) => {
  // Registrar acesso
  const timestamp = new Date();
  if (!stats.firstView) {
    stats.firstView = timestamp;
  }
  stats.lastView = timestamp;
  stats.totalViews++;
  
  // Detalhes da visualização
  const viewInfo = {
    timestamp: timestamp.toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referrer: req.headers.referer || 'direct',
    id: `view_${Date.now()}`
  };
  
  stats.viewDetails.push(viewInfo);
  saveStats();
  
  // Notificar no console
  console.log('\n🎉 Nova visita detectada!');
  console.log(`📅 Data e hora: ${timestamp.toLocaleString()}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`📱 Dispositivo: ${req.headers['user-agent']}`);
  console.log(`\n🎯 Total de visitas: ${stats.totalViews}`);
  
  res.send(playerHtml);
});

// Rota para servir o vídeo
app.get('/video', (req, res) => {
  debugLog('Requisição de vídeo recebida', { ip: req.ip });
  
  // Obter tamanho do arquivo
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Suporte para streaming parcial do vídeo
  if (range) {
    debugLog('Requisição com range', { range });
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    try {
      const file = fs.createReadStream(videoPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType
      });
      
      debugLog('Enviando parcial do vídeo', { start, end, chunksize });
      file.pipe(res);
    } catch (error) {
      debugLog('Erro ao criar stream do vídeo com range', error);
      res.status(500).send('Erro ao processar vídeo');
    }
  } else {
    // Streaming completo do vídeo
    try {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType
      });
      
      debugLog('Enviando vídeo completo', { fileSize });
      fs.createReadStream(videoPath).pipe(res);
    } catch (error) {
      debugLog('Erro ao criar stream do vídeo completo', error);
      res.status(500).send('Erro ao processar vídeo');
    }
  }
});

// Endpoint para registro de erros do cliente
app.post('/track/error', (req, res) => {
  const { sessionId, errorCode, errorMessage } = req.body;
  debugLog('Erro reportado pelo cliente', { sessionId, errorCode, errorMessage });
  res.status(200).send('OK');
});

// Endpoint para rastrear o início da visualização
app.post('/track/start', (req, res) => {
  const { sessionId, userAgent, language, screenSize, timestamp } = req.body;
  
  activeSessions[sessionId] = {
    start: new Date(),
    lastActive: new Date(),
    userAgent,
    language,
    screenSize,
    ip: req.ip,
    duration: 0,
    progress: 0,
    completed: false
  };
  
  console.log(`\n▶️ Visualização iniciada! Sessão: ${sessionId}`);
  console.log(`📱 Dispositivo: ${userAgent}`);
  console.log(`🌐 IP: ${req.ip}`);
  
  res.status(200).send('OK');
});

// Heartbeat para saber se o usuário ainda está assistindo
app.post('/track/heartbeat', (req, res) => {
  const { sessionId, duration, progress } = req.body;
  
  if (activeSessions[sessionId]) {
    activeSessions[sessionId].lastActive = new Date();
    activeSessions[sessionId].duration = duration;
    activeSessions[sessionId].progress = progress;
    
    debugLog(`Heartbeat da sessão ${sessionId}`, { progress: Math.round(progress * 100) + '%' });
  }
  
  res.status(200).send('OK');
});

// Pausa no vídeo
app.post('/track/pause', (req, res) => {
  const { sessionId, duration, progress } = req.body;
  
  if (activeSessions[sessionId]) {
    activeSessions[sessionId].lastActive = new Date();
    activeSessions[sessionId].duration = duration;
    activeSessions[sessionId].progress = progress;
    
    debugLog(`Vídeo pausado na sessão ${sessionId}`, { progress: Math.round(progress * 100) + '%' });
  }
  
  res.status(200).send('OK');
});

// Vídeo completado
app.post('/track/complete', (req, res) => {
  const { sessionId, duration, completed } = req.body;
  
  if (activeSessions[sessionId]) {
    const session = activeSessions[sessionId];
    session.lastActive = new Date();
    session.duration = duration;
    session.progress = 1;
    session.completed = completed;
    
    // Adicionar às estatísticas
    stats.viewDuration.push({
      sessionId,
      duration,
      completed: true,
      timestamp: new Date().toISOString(),
      device: session.userAgent
    });
    
    saveStats();
    
    console.log(`\n✅ Vídeo completado! Sessão: ${sessionId}`);
    console.log(`⏱️ Tempo de visualização: ${Math.round(duration)} segundos`);
  }
  
  res.status(200).send('OK');
});

// Saída da página
app.post('/track/exit', (req, res) => {
  let bodyData = '';
  
  req.on('data', chunk => {
    bodyData += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const { sessionId, duration, progress } = JSON.parse(bodyData);
      
      if (activeSessions[sessionId]) {
        const session = activeSessions[sessionId];
        
        // Adicionar às estatísticas
        stats.viewDuration.push({
          sessionId,
          duration,
          progress,
          completed: progress >= 0.9, // Considerar completo se assistiu 90%
          timestamp: new Date().toISOString(),
          device: session.userAgent
        });
        
        saveStats();
        
        console.log(`\n👋 Usuário saiu! Sessão: ${sessionId}`);
        console.log(`⏱️ Tempo total de visualização: ${Math.round(duration)} segundos`);
        console.log(`📊 Progresso: ${Math.round(progress * 100)}%`);
        
        // Remover a sessão
        delete activeSessions[sessionId];
      }
    } catch (error) {
      debugLog('Erro ao processar dados de saída', error);
    }
  });
  
  // Sempre responder com sucesso para sendBeacon
  res.status(200).send('OK');
});

// Endpoint para ver estatísticas (protegido)
app.get('/stats', (req, res) => {
  res.json({
    stats,
    activeSessions: Object.keys(activeSessions).length
  });
});

// Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor local iniciado em http://localhost:${PORT}`);
  console.log(`📹 Compartilhando vídeo: ${videoFileName}`);
  console.log(`📝 Com a mensagem: "${customMessage}"`);

  // Verificar se cloudflared está instalado
  const whichProcess = exec('which cloudflared', (error, stdout, stderr) => {
    if (error || !stdout || stderr.includes('not found')) {
      console.log('\n❌ Cloudflared não encontrado ou erro ao verificar.');
      console.log('   Verifique se está instalado e no PATH do sistema.');
      console.log('   Instale com:');
      console.log('   Ubuntu/Debian: sudo apt install cloudflared');
      console.log('   macOS: brew install cloudflared');
      console.log('   Windows: Baixe de https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
      console.error('Erro detalhado:', error || stderr);
      process.exit(1);
    }

    debugLog('Cloudflared encontrado em:', stdout.trim());

    // Iniciar o túnel Cloudflare
    console.log('\n⏳ Iniciando túnel Cloudflare... Isso pode levar alguns segundos.');
    console.log('   (Procurando pela URL pública...)');

    let tunnelReady = false;
    let publicUrl = null;
    let tunnelProcess = null;

    // Usar spawn em vez de exec para melhor controle do processo
    try {
      debugLog('Iniciando processo cloudflared...');
      
      // Opções para o spawn
      const options = {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      };
      
      // Iniciar processo com spawn para melhor controle
      tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], options);
      
      debugLog('Processo cloudflared iniciado com PID:', tunnelProcess.pid);
      
      // Armazenar o PID para encerramento posterior
      process.env.CLOUDFLARED_PID = tunnelProcess.pid;
      
      // Função para exibir a URL e QR Code
      const displayTunnelInfo = () => {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 TÚNEL PRONTO! SEU VÍDEO ESTÁ ACESSÍVEL NA INTERNET!');
        console.log('='.repeat(60));
        console.log('\n🔗 URL Pública para Compartilhar:');
        console.log(`\n   >>> ${publicUrl} <<< \n`);
        
        // Gerar QR Code
        console.log('📱 QR Code (escaneie para acessar no celular):');
        QRCode.generate(publicUrl, { small: true });
        
        console.log('\n📊 Estatísticas (visite esta URL no navegador):');
        console.log(`   ${publicUrl}/stats`);
        
        console.log('\n⚠️ Importante: O link acima funciona SOMENTE enquanto este programa estiver rodando.');
        console.log('   Seu computador precisa permanecer ligado e conectado à internet.');
        console.log('\n   Pressione Ctrl+C aqui no terminal para encerrar.');
        console.log('='.repeat(60) + '\n');
      };
      
      // Processar saída do cloudflared
      tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Usar um log mais detalhado para depuração
        debugLog('[cloudflared stdout]:', output.trim());
        
        // Se já encontramos a URL, não precisamos continuar
        if (publicUrl) {
          return;
        }
        
        // Procurar pela URL usando regex
        const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
        if (match) {
          publicUrl = match[0];
          tunnelReady = true;
          debugLog('URL do túnel encontrada:', publicUrl);
          displayTunnelInfo();
        }
      });
      
      // Processar erros do cloudflared
      tunnelProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString().trim();
        
        // Filtrar mensagens informativas (não erros)
        if (errorOutput.includes('ERR') && !errorOutput.includes('INF') && !errorOutput.includes('WRN')) {
          console.error(`\n‼️ [cloudflared ERRO]: ${errorOutput}`);
        } else {
          // Log de mensagens informativas para depuração
          debugLog('[cloudflared stderr]:', errorOutput);
        }
      });
      
      // Lidar com o encerramento do processo cloudflared
      tunnelProcess.on('close', (code) => {
        debugLog(`Processo cloudflared encerrado com código ${code}`);
        
        if (!tunnelReady && code !== 0) {
          console.error('\n❌ O túnel foi encerrado inesperadamente ANTES de obter a URL pública.');
          console.error('\n❌ O túnel foi encerrado inesperadamente ANTES de obter a URL pública.');
          console.error('   Possíveis problemas:');
          console.error('   1. Conexão com a internet instável ou restrita');
          console.error('   2. Firewall bloqueando a conexão do cloudflared');
          console.error('   3. Versão desatualizada do cloudflared');
          console.error('   4. Cloudflare pode estar com problemas temporários');
          console.error('\n   Tente executar manualmente: cloudflared tunnel --url http://localhost:3000');
          console.error('   para ver mensagens de erro mais detalhadas.');
        } else if (code !== 0) {
          console.warn('\n⚠️ O túnel Cloudflared foi encerrado com código de erro:', code);
          console.warn('   O serviço de compartilhamento não está mais disponível.');
        }
        
        // Tentar reiniciar automaticamente em caso de falha?
        if (code !== 0 && !process.env.TUNNEL_RESTART_ATTEMPTED) {
          process.env.TUNNEL_RESTART_ATTEMPTED = "true";
          console.log('\n🔄 Tentando reiniciar o túnel automaticamente...');
          
          // Implementar reinício com método alternativo
          try {
            debugLog('Tentando método alternativo para o túnel...');
            
            // Usar um método alternativo: cloudflared http
            const alternativeTunnel = spawn('cloudflared', ['tunnel', 'http', `http://localhost:${PORT}`], {
              shell: true,
              stdio: ['pipe', 'pipe', 'pipe']
            });
            
            process.env.CLOUDFLARED_ALT_PID = alternativeTunnel.pid;
            
            alternativeTunnel.stdout.on('data', (data) => {
              const output = data.toString();
              debugLog('[alternativeTunnel stdout]:', output.trim());
              
              // Tentar encontrar URL no formato diferente
              const altMatch = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
              if (altMatch && !publicUrl) {
                publicUrl = altMatch[0];
                tunnelReady = true;
                console.log('\n✅ Conexão estabelecida usando método alternativo!');
                displayTunnelInfo();
              }
            });
            
            alternativeTunnel.stderr.on('data', (data) => {
              debugLog('[alternativeTunnel stderr]:', data.toString().trim());
            });
            
          } catch (e) {
            console.error('Falha ao tentar método alternativo:', e);
          }
        }
      });
      
      // Configurar timeout para verificar se a URL não foi encontrada após um tempo
      setTimeout(() => {
        if (!publicUrl) {
          debugLog('Timeout: URL do túnel não encontrada após 60 segundos');
          console.warn('\n⚠️ Não foi possível obter a URL do túnel após 60 segundos.');
          console.warn('   Isso pode indicar problemas com o Cloudflare ou com sua conexão.');
          console.warn('   O servidor local ainda está rodando em: http://localhost:3000');
          
          // Verificar status do processo
          if (tunnelProcess && tunnelProcess.pid) {
            try {
              // No Unix, enviar sinal 0 verifica se o processo existe sem afetá-lo
              process.kill(tunnelProcess.pid, 0);
              console.warn('   O processo cloudflared ainda está rodando (PID:', tunnelProcess.pid, ')');
              console.warn('   Verificando estado do processo...');
              
              // Em sistemas Unix, podemos verificar se o processo está "zombie"
              if (process.platform !== 'win32') {
                exec(`ps -p ${tunnelProcess.pid} -o state`, (err, stdout) => {
                  if (!err) {
                    debugLog('Estado do processo:', stdout.trim());
                    if (stdout.includes('Z')) {
                      console.warn('   O processo está em estado "zombie" - não está funcionando corretamente.');
                    }
                  }
                });
              }
            } catch (e) {
              console.warn('   O processo cloudflared parece ter terminado sem notificar.');
            }
          }
          
          console.warn('\n💡 Sugestões:');
          console.warn('   1. Verifique se o cloudflared está na versão mais recente');
          console.warn('   2. Tente reiniciar o programa');
          console.warn('   3. Verifique sua conexão com a internet');
          console.warn('   4. Tente usar outro método de compartilhamento, como ngrok');
          
          // Oferecer opção de tentar método alternativo
          console.warn('\n   Deseja tentar um método alternativo? Execute ctrl+C e depois:');
          console.warn('   node video-share.js /caminho/do/video.mp4 "Mensagem" --alt-tunnel');
        }
      }, 60000);
      
    } catch (execError) {
      console.error('\n❌ Falha crítica ao tentar iniciar o processo cloudflared:', execError);
      console.error('   Verifique se o cloudflared está corretamente instalado.');
      
      // Verificar instalação
      exec('cloudflared --version', (err, stdout, stderr) => {
        if (err) {
          console.error('   Não foi possível verificar a versão do cloudflared:', err.message);
        } else {
          console.error('   Versão do cloudflared:', stdout.trim());
        }
      });
      
      // Continuar com o servidor local
      console.log('\n⚠️ Continuando apenas com servidor local em: http://localhost:3000');
    }
  });
});

// Encerrar graciosamente ao receber Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Recebido Ctrl+C. Encerrando servidor e túnel...');
  
  // Salvar estatísticas
  saveStats();
  debugLog('Estatísticas salvas antes de encerrar');

  // Tentar encerrar o processo cloudflared
  const tryKillProcess = (pid, name) => {
    if (pid) {
      try {
        debugLog(`Tentando encerrar processo ${name} (PID: ${pid})`);
        // Enviar SIGTERM primeiro
        process.kill(parseInt(pid, 10), 'SIGTERM');
        return true;
      } catch (e) {
        debugLog(`Erro ao encerrar ${name} (PID: ${pid}):`, e.message);
        try {
          // Tentar com SIGKILL se necessário
          process.kill(parseInt(pid, 10), 'SIGKILL');
          return true;
        } catch (e2) {
          debugLog(`Falha também com SIGKILL para ${name}:`, e2.message);
          return false;
        }
      }
    }
    return false;
  };

  // Tentar encerrar processos do cloudflared
  let pidKilled = false;
  
  // Tentar o processo principal
  if (process.env.CLOUDFLARED_PID) {
    pidKilled = tryKillProcess(process.env.CLOUDFLARED_PID, 'cloudflared') || pidKilled;
  }
  
  // Tentar o processo alternativo se existir
  if (process.env.CLOUDFLARED_ALT_PID) {
    pidKilled = tryKillProcess(process.env.CLOUDFLARED_ALT_PID, 'cloudflared alternativo') || pidKilled;
  }
  
  if (!pidKilled) {
    debugLog('Nenhum processo cloudflared foi encerrado, tentando matar por nome...');
    
    // Em sistemas Unix, podemos tentar matar por nome
    if (process.platform !== 'win32') {
      exec('pkill -f "cloudflared tunnel"', (err) => {
        if (err) {
          debugLog('Erro ao tentar matar cloudflared por nome:', err);
        } else {
          debugLog('Comando para matar cloudflared por nome executado');
        }
      });
    } else {
      // No Windows, usar taskkill
      exec('taskkill /F /IM cloudflared.exe', (err) => {
        if (err) {
          debugLog('Erro ao tentar matar cloudflared no Windows:', err);
        } else {
          debugLog('Comando taskkill para cloudflared executado');
        }
      });
    }
  }

  // Fechar o servidor Express
  server.close((err) => {
    if (err) {
      console.error("❌ Erro ao fechar o servidor Express:", err);
      process.exit(1);
    }
    console.log('✅ Servidor web local encerrado com sucesso.');
    process.exit(0);
  });

  // Adiciona um timeout para forçar a saída se algo travar
  setTimeout(() => {
    debugLog('Timeout de encerramento atingido, forçando saída');
    console.error('❌ Servidor ou túnel não encerraram a tempo. Forçando saída.');
    process.exit(1);
  }, 5000);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('\n❌ Erro não capturado:', error);
  debugLog('Stack trace:', error.stack);
  
  // Salvar estatísticas em caso de erro
  try {
    saveStats();
  } catch (e) {
    debugLog('Erro ao salvar estatísticas durante exceção:', e);
  }
  
  // Continuar executando
  console.log('\n⚠️ O servidor continuará em execução apesar do erro.');
});

// Implementar verificação contínua de estado do túnel
const tunnelCheckInterval = setInterval(() => {
  const pid = process.env.CLOUDFLARED_PID || process.env.CLOUDFLARED_ALT_PID;
  
  if (pid && process.platform !== 'win32') {
    exec(`ps -p ${pid} -o state`, (err, stdout) => {
      if (err) {
        debugLog('Processo cloudflared não encontrado no intervalo de verificação');
        clearInterval(tunnelCheckInterval);
      } else {
        // Se encontrarmos algo estranho no estado, registrar
        if (!stdout.includes('S') && !stdout.includes('R')) {
          debugLog('Estado incomum do processo cloudflared:', stdout.trim());
        }
      }
    });
  }
}, 30000);

// Log de finalização da inicialização
debugLog('Inicialização completa');