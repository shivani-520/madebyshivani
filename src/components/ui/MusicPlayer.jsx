import { useRef } from "react";

export default function MusicPlayer() {
  const audioRef = useRef(null);
  
  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src="/audio/diamond_tunes-groove-machine-210089.mp3"
        loop
        preload="metadata"
        aria-label="Background music"
        controls
      />
    </div>
  );
}