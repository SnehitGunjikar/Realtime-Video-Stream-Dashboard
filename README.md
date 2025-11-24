# RTSP Multi-Stream Dashboard

A synchronized multi-stream dashboard using React and HLS for displaying multiple RTSP camera feeds.

## Features
- **HLS Generation**: Node.js backend using FFmpeg to convert RTSP streams to HLS
- **Multi-Stream Display**: Displays 6 video players in a responsive grid
- **Stream Synchronization**: Custom logic to keep all players in sync (within ~0.5s)
- **Fallback System**: Automatic failover between multiple RTSP sources
- **Modern UI**: Clean dashboard with header, footer, and camera statistics

## Tech Stack
- **Frontend**: React + Vite + HLS.js
- **Backend**: Node.js + Express + FFmpeg
- **Deployment**: Vercel (client) + Render (server)

## Local Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your RTSP URLs if needed
npm start
```

The server will start on `http://localhost:4000`.

### 2. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# Edit .env if your backend is on a different URL
npm run dev
```

The app will run on `http://localhost:5173`.

## Environment Variables

### Server (.env)
```
PORT=4000
RTSP_URL_PRIMARY=rtsp://13.60.76.79:8554/live2
RTSP_URL_FALLBACK=rtsp://170.93.143.139/rtplive/470011e600ef003a004ee33696235daa
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_BACKEND_URL=http://localhost:4000
```

## Deployment

### Deploy Server to Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure the service:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables:
   - `RTSP_URL_PRIMARY`: Your primary RTSP stream URL
   - `RTSP_URL_FALLBACK`: Your fallback RTSP stream URL (optional)
   - `CLIENT_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - **Note**: `PORT` is automatically set by Render
5. Deploy!

Your server will be available at `https://your-app.onrender.com`

### Deploy Client to Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure the project:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_BACKEND_URL`: Your Render server URL (e.g., `https://your-app.onrender.com`)
5. Deploy!

Your client will be available at `https://your-app.vercel.app`

## API Endpoints

- `GET /stream1.m3u8` to `GET /stream6.m3u8` - HLS playlist for each simulated stream
- `GET /active-stream` - Get currently active RTSP source
- `GET /health` - Health check endpoint (for monitoring)

## How It Works

1. **Backend**: The server connects to RTSP streams and transcodes them to HLS format using FFmpeg
2. **Fallback**: If the primary stream fails, it automatically switches to the fallback stream
3. **Frontend**: React app uses HLS.js to play the streams in 6 synchronized players
4. **Sync Logic**: A background process monitors all players and adjusts playback to keep them synchronized

## Troubleshooting

### No video showing
- Check if your RTSP URLs are accessible
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure CORS is properly configured

### CORS errors in production
- Make sure `CLIENT_URL` on the server matches your Vercel deployment URL
- Verify the `VITE_BACKEND_URL` on the client points to your Render server

### Streams not syncing
- This is normal for live streams with network latency
- The sync threshold is set to 0.5 seconds by default
- Adjust `SYNC_THRESHOLD` in `App.jsx` if needed

## License

ISC

