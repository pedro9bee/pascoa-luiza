### 🇺🇸 `README.md`

```markdown
# 🎥 video-share-stats

Easily share personalized video messages over the internet — no upload needed. This project uses a local Node.js server with Cloudflare Tunnel to generate a public, temporary URL for any video on your computer, and provides detailed viewer statistics.

> Ideal for sending family greetings, event invitations, or creative surprises via video.

---

## ✨ Features

- 🌐 Public shareable link via Cloudflare Tunnel
- 📊 Real-time viewer analytics (total views, duration, device info)
- 📱 QR Code generation for easy sharing
- 🔐 Keeps your video local — no uploads or third-party hosting
- 🔁 Fallback tunnel mode if the main method fails
- 🐞 Built-in debug logging and crash handling
- 🖥️ macOS background execution via LaunchAgent

---

## 📦 Requirements

- Node.js 14 or higher
- `npm` installed
- [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) installed and accessible from the terminal

---

## 🚀 Installation

```bash
git clone https://github.com/your-username/video-share-stats.git
cd video-share-stats
npm install
```

---

## ▶️ How to Use

Run the script by passing a video path and (optionally) a custom message:

```bash
node video-share.js /path/to/video.mp4 "Happy Easter, my dear!"
```

You’ll receive:

- A public link (accessible while the app is running)
- A QR code
- A live stats dashboard at `/stats`

> ⚠️ The link works only while your machine is online and the server is running.

---

## 🧠 Advanced: macOS Persistent Mode

To keep the video server running in the background (even after logout), use:

```bash
./share-video.sh /path/to/video.mp4 "Your custom message"
```

You'll be asked to choose between:

1. Run in terminal (stops on logout)
2. Run as background LaunchAgent (stays active)

To monitor logs:
```bash
tail -f ./video_server.log
```

To stop:
```bash
launchctl unload ~/Library/LaunchAgents/com.video.share.plist
```

---

## 📈 Viewer Analytics

Visit the `/stats` URL shown in the terminal to access:

- Total views
- Device/browser info
- View duration
- Completion rates per session

All data is saved locally in `stats/access_stats.json`.

---

## 🛠 Troubleshooting

If the tunnel fails to start or the video doesn't play correctly, see [`INSTALL.md`](./INSTALL.md) for solutions:

- Cloudflared version issues
- Network/firewall conflicts
- Alternative tunnel methods (e.g., Ngrok, LocalTunnel)

---

## 🧪 Quick Local Test

To verify everything is working:

```bash
# Start a test server
node -e "require('express')().get('/',(q,s)=>s.send('OK')).listen(3000,()=>console.log('OK'))"

# In another terminal
curl http://localhost:3000
```

---

## 📄 License

MIT © Pedro Lemos
```
