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

---

## Technical Documentation

### 1. RTSP to HLS Conversion Process

#### Overview
The backend server converts Real-Time Streaming Protocol (RTSP) video streams into HTTP Live Streaming (HLS) format, making them compatible with web browsers.

#### Tools Used

**FFmpeg (via fluent-ffmpeg)**
- **Purpose**: Industry-standard multimedia framework for video transcoding
- **Package**: `fluent-ffmpeg` - Node.js wrapper for FFmpeg
- **Static Binary**: `ffmpeg-static` - Bundled FFmpeg binary (no system installation required)

#### Conversion Pipeline

```
RTSP Stream → FFmpeg → HLS Segments (.ts) + Playlist (.m3u8) → Web Browser
```

#### Detailed Process

**Step 1: RTSP Connection**
```javascript
ffmpeg(source)
  .inputOptions([
    '-rtsp_transport tcp',  // Use TCP for reliable connection
    '-re'                   // Read input at native frame rate
  ])
```
- Connects to RTSP URL over TCP (more reliable than UDP)
- `-re` flag ensures real-time processing without overwhelming the system

**Step 2: Transcoding Configuration**
```javascript
.addOptions([
  '-c:v copy',              // Copy video codec (no re-encoding)
  '-c:a copy',              // Copy audio codec (no re-encoding)
  '-hls_time 2',            // 2-second segment duration
  '-hls_list_size 5',       // Keep 5 segments in playlist
  '-hls_flags delete_segments', // Auto-delete old segments
  '-start_number 1'         // Start segment numbering at 1
])
```

**Key Parameters Explained:**
- **`-c:v copy` & `-c:a copy`**: Copies the video/audio streams without re-encoding, reducing CPU usage and latency
- **`-hls_time 2`**: Creates 2-second video segments for low latency
- **`-hls_list_size 5`**: Maintains a rolling window of 5 segments (10 seconds total)
- **`-hls_flags delete_segments`**: Automatically removes old segments to save disk space

**Step 3: Output Generation**
```javascript
.output(HLS_OUTPUT_FILE)  // server/public/hls/stream.m3u8
```

The output consists of:
- **Playlist file** (`stream.m3u8`): Index of available video segments
- **Segment files** (`stream1.ts`, `stream2.ts`, etc.): 2-second video chunks

**Step 4: Error Handling & Fallback**
```javascript
.on('error', (err) => {
  // Switch to fallback RTSP source
  currentSourceIndex = (currentSourceIndex + 1) % RTSP_URLS.length;
  setTimeout(startTranscoding, 5000);  // Retry after 5 seconds
})
```

#### Why HLS?
- **Browser Compatibility**: Works in all modern browsers via HLS.js
- **Adaptive Streaming**: Can adjust quality based on network conditions
- **Low Latency**: 2-second segments provide near real-time streaming
- **Scalability**: Static files can be served via CDN

---

### 2. Creating 5-6 Distinct HLS Streams

#### Simulation Strategy

Since we have a single RTSP source, we **simulate multiple camera feeds** by serving the same HLS stream through different endpoints.

#### Implementation

**Backend Route Handling** (`server/index.js`):
```javascript
app.get('/stream:id.m3u8', (req, res) => {
  const id = req.params.id;  // Captures 1, 2, 3, 4, 5, 6
  console.log(`Serving simulated stream ${id}`);
  
  if (fs.existsSync(HLS_OUTPUT_FILE)) {
    res.sendFile(HLS_OUTPUT_FILE);  // Same file for all streams
  } else {
    res.status(404).send('Stream not ready');
  }
});
```

**How It Works:**
1. Client requests `/stream1.m3u8`, `/stream2.m3u8`, ..., `/stream6.m3u8`
2. Server responds with the **same** `stream.m3u8` file for all requests
3. Each player thinks it's loading a different stream
4. All players share the same `.ts` segment files

**Static File Serving:**
```javascript
app.use(express.static(HLS_OUTPUT_DIR));
```
- Serves HLS segments (`.ts` files) directly from `server/public/hls/`
- All players access the same segment files

#### Why This Approach?

**Advantages:**
- **Resource Efficient**: Only one FFmpeg process needed
- **Synchronized by Default**: All players use identical segments
- **Scalable**: Can simulate unlimited streams without additional processing

**Real-World Alternative:**
In production with actual multiple cameras, you would:
1. Run separate FFmpeg processes for each RTSP source
2. Output to different directories (`hls/cam1/`, `hls/cam2/`, etc.)
3. Serve distinct playlists for each camera

---

### 3. React Component Logic & Synchronization

#### Component Architecture

```
App.jsx
├── VideoPlayer.jsx (x6 instances)
├── Header.jsx
├── Footer.jsx
└── StatsPanel.jsx
```

#### VideoPlayer Component

**Purpose**: Wrapper around HLS.js player with synchronization controls

**Key Methods:**

```javascript
// Initialize HLS.js player
useEffect(() => {
  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90
  });
  
  hls.loadSource(src);  // Load HLS stream
  hls.attachMedia(videoRef.current);  // Attach to <video> element
}, [src]);
```

**Exposed Methods via `useImperativeHandle`:**

```javascript
useImperativeHandle(ref, () => ({
  getCurrentTime: () => videoRef.current?.currentTime || 0,
  seekTo: (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }
}));
```

These methods allow the parent component (`App.jsx`) to:
- **Read** the current playback position
- **Control** playback by seeking to specific timestamps

---

#### Synchronization Algorithm (App.jsx)

**Problem**: Multiple video players drift out of sync due to:
- Network latency variations
- Buffer differences
- Playback rate inconsistencies

**Solution**: Centralized synchronization loop

**Step 1: Setup Sync Interval**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    syncPlayers();
  }, CHECK_INTERVAL);  // Run every 1000ms (1 second)
  
  return () => clearInterval(interval);
}, []);
```

**Step 2: Collect Playback Times**
```javascript
const syncPlayers = () => {
  const players = playerRefs.current.filter(p => p);
  if (players.length < 2) return;  // Need at least 2 players
  
  // Get current time from each player
  const times = players.map(p => p.getCurrentTime());
```

**Step 3: Calculate Average Time**
```javascript
  // Filter out players that haven't started (time = 0)
  const validTimes = times.filter(t => t > 0);
  if (validTimes.length === 0) return;
  
  // Calculate mean playback time
  const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
```

**Step 4: Sync Out-of-Sync Players**
```javascript
  players.forEach((player, index) => {
    const currentTime = times[index];
    const diff = currentTime - avgTime;
    
    // If player is more than 0.5s off, sync it
    if (Math.abs(diff) > SYNC_THRESHOLD) {
      console.log(`Syncing player ${index + 1}: diff ${diff.toFixed(2)}s`);
      player.seekTo(avgTime);  // Jump to average time
    }
  });
};
```

**Algorithm Visualization:**

```
Player 1: 10.2s ─┐
Player 2: 10.5s  ├─→ Average: 10.3s
Player 3: 10.1s  │
Player 4: 10.4s ─┘
Player 5: 11.0s ← Out of sync! (diff = +0.7s > 0.5s threshold)
Player 6: 10.3s

Action: Seek Player 5 to 10.3s
```

**Key Parameters:**
- **`SYNC_THRESHOLD`**: `0.5` seconds - Maximum allowed drift before correction
- **`CHECK_INTERVAL`**: `1000` ms - How often to check synchronization

#### Why This Works

1. **Consensus-Based**: Uses average time, not a single "master" player
2. **Tolerant**: Ignores players that haven't started (time = 0)
3. **Adaptive**: Automatically corrects drift without user intervention
4. **Efficient**: Only seeks players that exceed the threshold

#### Performance Considerations

**Pros:**
- Simple implementation
- Works with any number of players
- Self-correcting

**Cons:**
- Seeking can cause brief visual glitches
- Not suitable for ultra-low latency (<0.5s) requirements
- May struggle with highly variable network conditions

**Optimization Opportunities:**
- Adjust `SYNC_THRESHOLD` based on network quality
- Use playback rate adjustment instead of seeking
- Implement predictive synchronization based on drift trends

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

