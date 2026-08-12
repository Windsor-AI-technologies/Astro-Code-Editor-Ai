import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Search, Music, Volume2 } from 'lucide-react';
import './MusicView.css';

interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
  collectionName: string;
}

export default function MusicView() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Load default tracks on mount
  useEffect(() => {
    searchTracks('lofi chill');
  }, []);

  // Listen for Perl play_song action
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, query: q } = (e as CustomEvent).detail;
      if (type === 'play_song' && q) {
        setQuery(q);
        searchTracks(q).then(() => {
          // Auto-play first result after search
          setTimeout(() => {
            const firstTrack = document.querySelector('.music-track') as HTMLElement;
            if (firstTrack) firstTrack.click();
          }, 500);
        });
      }
    };
    window.addEventListener('astro-action', handler);
    return () => window.removeEventListener('astro-action', handler);
  }, []);

  async function searchTracks(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=30`);
      const data = await res.json();
      setTracks(data.results.filter((t: any) => t.previewUrl));
    } catch {
      setTracks([]);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchTracks(query);
  }

  function handlePlay(track: Track) {
    if (playing?.trackId === track.trackId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    setPlaying(track);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }

  function handleEnded() {
    // Auto-play next
    if (!playing) return;
    const idx = tracks.findIndex(t => t.trackId === playing.trackId);
    if (idx < tracks.length - 1) {
      handlePlay(tracks[idx + 1]);
    } else {
      setIsPlaying(false);
    }
  }

  return (
    <div className="music-view">
      <audio ref={audioRef} onEnded={handleEnded} />

      {/* Sidebar */}
      <div className="music-sidebar">
        <div className="music-sidebar-header">
          <Music size={14} />
          <span>Music</span>
        </div>
        <form className="music-search" onSubmit={handleSearch}>
          <Search size={12} />
          <input placeholder="Search songs..." value={query} onChange={e => setQuery(e.target.value)} />
        </form>
        <div className="music-track-list">
          {loading && <div className="music-loading">Searching...</div>}
          {tracks.map(track => (
            <div
              key={track.trackId}
              className={`music-track ${playing?.trackId === track.trackId ? 'active' : ''}`}
              onClick={() => handlePlay(track)}
            >
              <img className="music-track-art" src={track.artworkUrl100} alt="" />
              <div className="music-track-info">
                <span className="music-track-name">{track.trackName}</span>
                <span className="music-track-artist">{track.artistName}</span>
              </div>
              {playing?.trackId === track.trackId && isPlaying && (
                <div className="music-eq"><span /><span /><span /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Now Playing */}
      <div className="music-main">
        {playing ? (
          <div className="music-now-playing">
            <img className="music-big-art" src={playing.artworkUrl100.replace('100x100', '300x300')} alt="" />
            <h2 className="music-title">{playing.trackName}</h2>
            <p className="music-artist">{playing.artistName}</p>
            <p className="music-album">{playing.collectionName}</p>
            <div className="music-controls">
              <button className="music-play-btn" onClick={() => handlePlay(playing)}>
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            </div>
            <div className="music-volume">
              <Volume2 size={13} />
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} />
            </div>
            <span className="music-preview-badge">30s preview</span>
          </div>
        ) : (
          <div className="music-empty">
            <Music size={48} />
            <h2>Music</h2>
            <p>Search and play song previews while you code</p>
          </div>
        )}
      </div>
    </div>
  );
}
