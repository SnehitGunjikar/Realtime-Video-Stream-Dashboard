import React, { useEffect, useRef, useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import Header from './components/Header';
import Footer from './components/Footer';
import StatsPanel from './components/StatsPanel';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const STREAM_COUNT = 6;
const SYNC_THRESHOLD = 0.5; // Seconds
const CHECK_INTERVAL = 1000; // Milliseconds

function App() {
  const playerRefs = useRef([]);
  const [stats, setStats] = useState({});
  const [activeStreams, setActiveStreams] = useState(new Set());

  // Initialize refs array
  playerRefs.current = new Array(STREAM_COUNT).fill(null);

  useEffect(() => {
    const interval = setInterval(() => {
      syncPlayers();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const syncPlayers = () => {
    const players = playerRefs.current.filter(p => p);
    if (players.length < 2) return;

    // Get current times
    const times = players.map(p => p.getCurrentTime());

    // Calculate average time (excluding 0s which might mean not started)
    const validTimes = times.filter(t => t > 0);
    if (validTimes.length === 0) return;

    const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;

    // Update stats for visualization
    setStats({
      avgTime: avgTime.toFixed(2),
      deltas: times.map(t => (t - avgTime).toFixed(2))
    });

    // Sync logic
    players.forEach((player, index) => {
      const currentTime = times[index];
      const diff = currentTime - avgTime;

      if (Math.abs(diff) > SYNC_THRESHOLD) {
        console.log(`Syncing player ${index + 1}: diff ${diff.toFixed(2)}s`);
        // If behind, seek forward. If ahead, we could pause, but seeking to avg is simpler.
        // However, for live streams, seeking too far forward might hit the buffer end.
        // We'll try to seek to avgTime.
        player.seekTo(avgTime);
      }
    });
  };

  const handleStatusChange = (index, isActive) => {
    setActiveStreams(prev => {
      const newSet = new Set(prev);
      if (isActive) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  };

  return (
    <div className="app-container">
      <Header />
      <StatsPanel total={STREAM_COUNT} active={activeStreams.size} />
      <div className="dashboard">
        {Array.from({ length: STREAM_COUNT }).map((_, index) => (
          <div key={index} className="player-wrapper">
            <VideoPlayer
              ref={el => playerRefs.current[index] = el}
              src={`${BACKEND_URL}/stream${index + 1}.m3u8`}
              onStatusChange={(isActive) => handleStatusChange(index, isActive)}
            />
            <div className="player-overlay">
              Cam {index + 1}
              {stats.deltas && ` | Δ: ${stats.deltas[index]}s`}
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}

export default App;
