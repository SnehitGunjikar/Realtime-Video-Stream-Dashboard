const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');

const app = express();

// Environment variables for deployment
const PORT = process.env.PORT || 4000;
const RTSP_URL_PRIMARY = process.env.RTSP_URL_PRIMARY || 'rtsp://13.60.76.79:8554/live2';
const RTSP_URL_FALLBACK = process.env.RTSP_URL_FALLBACK || 'rtsp://170.93.143.139/rtplive/470011e600ef003a004ee33696235daa';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// RTSP Sources (primary first, fallback after)
const RTSP_URLS = [RTSP_URL_PRIMARY];
if (RTSP_URL_FALLBACK) {
    RTSP_URLS.push(RTSP_URL_FALLBACK);
}

let currentSourceIndex = 0;
let isTranscoding = false;

const getCurrentRTSP = () => RTSP_URLS[currentSourceIndex];
const HLS_OUTPUT_DIR = path.join(__dirname, 'public', 'hls');
const HLS_OUTPUT_FILE = path.join(HLS_OUTPUT_DIR, 'stream.m3u8');

// Ensure output directory exists
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
    fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

// CORS configuration for production
app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// Serve HLS segments and playlist
app.use(express.static(HLS_OUTPUT_DIR));

// Simulate multiple streams
// When requesting /stream1.m3u8, /stream2.m3u8, etc., serve the main stream.m3u8
// The segments inside will be requested from the root, which express.static handles.
app.get('/stream:id.m3u8', (req, res) => {
    const id = req.params.id;
    console.log(`Serving simulated stream ${id}`);
    if (fs.existsSync(HLS_OUTPUT_FILE)) {
        res.sendFile(HLS_OUTPUT_FILE);
    } else {
        res.status(404).send('Stream not ready');
    }
});

// Endpoint to inspect the currently active RTSP source
app.get('/active-stream', (req, res) => {
    res.json({ index: currentSourceIndex, url: getCurrentRTSP() });
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        transcoding: isTranscoding,
        currentSource: getCurrentRTSP(),
        sourceIndex: currentSourceIndex
    });
});

// Start FFmpeg transcoding
const startTranscoding = () => {
    if (isTranscoding) {
        console.log('Transcoding already running, skipping start.');
        return;
    }
    isTranscoding = true;
    const source = getCurrentRTSP();
    console.log(`Starting FFmpeg transcoding from ${source} ...`);
    ffmpeg(source)
        .inputOptions([
            '-rtsp_transport tcp',
            '-re' // Read input at native frame rate
        ])
        .addOptions([
            '-c:v copy', // Copy video codec (no re-encoding if possible, faster)
            '-c:a copy', // Copy audio codec
            '-hls_time 2', // Segment duration 2 seconds
            '-hls_list_size 5', // Keep 5 segments in playlist
            '-hls_flags delete_segments', // Delete old segments
            '-start_number 1'
        ])
        .output(HLS_OUTPUT_FILE)
        .on('end', () => {
            console.log('FFmpeg process ended');
            isTranscoding = false;
            // Restart after a short delay (try same source again)
            setTimeout(startTranscoding, 2000);
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err && err.message ? err.message : err);
            // mark not running so restart logic can start a new process
            isTranscoding = false;
            // switch to next source as fallback
            const failedIndex = currentSourceIndex;
            currentSourceIndex = (currentSourceIndex + 1) % RTSP_URLS.length;
            console.log(`Switching RTSP source index from ${failedIndex} to ${currentSourceIndex}`);
            // Retry after a delay
            setTimeout(startTranscoding, 5000);
        })
        .on('start', (commandLine) => {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .run();
};

startTranscoding();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Simulated streams available at:`);
    for (let i = 1; i <= 6; i++) {
        console.log(`- http://localhost:${PORT}/stream${i}.m3u8`);
    }
});
