#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const QRCode = require('qrcode-terminal');
const mime = require('mime-types');

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

// Iniciar servidor Express
const app = express();
const PORT = 3000;
const videoFileName = path.basename(videoPath);

// Página HTML para o player de vídeo com tema de Páscoa
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
            <video controls autoplay>
                <source src="/video" type="${mimeType}">
                Seu navegador não suporta vídeos HTML5.
            </video>
        </div>
    </div>
    
    <div class="bunny"></div>
</body>
</html>
`;

// Rota para a página principal
app.get('/', (req, res) => {
  res.send(playerHtml);
});

// Rota para servir o vídeo
app.get('/video', (req, res) => {
  // Obter tamanho do arquivo
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Suporte para streaming parcial do vídeo
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType
    });
    file.pipe(res);
  } else {
    // Streaming completo do vídeo
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado em http://localhost:${PORT}`);
  console.log(`📹 Compartilhando: ${videoFileName}`);

  // Verificar se cloudflared está instalado
  exec('which cloudflared', (error) => {
    if (error) {
      console.log('\n❌ Cloudflared não encontrado. Por favor, instale com:');
      console.log('Ubuntu/Debian: sudo apt install cloudflared');
      console.log('macOS: brew install cloudflared');
      console.log('Windows: Baixe de https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
      process.exit(1);
    }

    // Iniciar o túnel Cloudflare
    console.log('\n⏳ Iniciando túnel Cloudflare (aguarde)...');
    
    const cloudflared = exec('cloudflared tunnel --url http://localhost:3000');

    // Processar a saída do cloudflared para extrair a URL
    cloudflared.stdout.on('data', (data) => {
      // Procurar pela URL no formato https://xxx-xxx-xx.trycloudflare.com
      const match = data.toString().match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
      if (match) {
        const url = match[1];
        
        // Limpar terminal (opcional)
        console.clear();
        
        // Exibir informações
        console.log('\n🎉 Tudo pronto! Seu vídeo está disponível na internet!');
        console.log('\n🔗 URL para assistir o vídeo:');
        console.log(`\n   ${url}\n`);
        
        // Gerar QR Code
        console.log('📱 Escaneie o QR Code abaixo para acessar no celular:');
        QRCode.generate(url, { small: true });
        
        console.log('\n💌 Mensagem incluída:');
        console.log(`"${customMessage}"`);
        
        console.log('\n⚠️  Importante: Este link funcionará apenas enquanto este programa estiver em execução.');
        console.log('   Pressione Ctrl+C para encerrar quando terminar.\n');
      }
    });

    // Capturar erros
    cloudflared.stderr.on('data', (data) => {
      if (data.toString().includes('error')) {
        console.error(`\n❌ Erro ao iniciar túnel: ${data}`);
      }
    });
  });
});

// Encerrar graciosamente ao receber Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando servidor e túnel...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso.');
    process.exit(0);
  });
});