import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

const VideoPlayer = forwardRef(({ src, onTimeUpdate, onStatusChange }, ref) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getCurrentTime: () => videoRef.current ? videoRef.current.currentTime : 0,
        seekTo: (time) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
            }
        },
        play: () => videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        getBuffered: () => videoRef.current?.buffered,
    }));

    useEffect(() => {
        let hls;

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
                onStatusChange && onStatusChange(true);
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log("Seems like a network error has encountered, try to recover");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log("Seems like a media error has encountered, try to recover");
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            onStatusChange && onStatusChange(false);
                            break;
                    }
                }
            });

        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = src;
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current.play();
            });
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src]);

    return (
        <div className="video-container" style={{ width: '100%', height: '100%', background: '#000' }}>
            <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                playsInline
                onTimeUpdate={() => onTimeUpdate && onTimeUpdate(videoRef.current.currentTime)}
            />
        </div>
    );
});

export default VideoPlayer;
