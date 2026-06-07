import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuestGate from '../components/GuestGate';
import { getChatSocket } from '../lib/socket';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import './ReadingRoom.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const REACTION_PRESET = ['😮', '🔥', '❤️', '😂', '🤯', '👏', '⚡', '😱', '😭', '💔'];
const AVATAR_COLORS = [
  'linear-gradient(135deg, #722f37, #b8860b)',
  'linear-gradient(135deg, #2d6a4f, #52b788)',
  'linear-gradient(135deg, #3a0ca3, #7209b7)',
  'linear-gradient(135deg, #e07a5f, #f2cc8f)',
  'linear-gradient(135deg, #264653, #2a9d8f)',
  'linear-gradient(135deg, #6d597a, #b56576)',
  'linear-gradient(135deg, #0077b6, #00b4d8)',
  'linear-gradient(135deg, #d4a373, #e9c46a)',
];

const getEntityId = (v) => (v?._id || v?.id || v || '').toString();
const getUsername = (u) => u?.username || u?.name || 'Reader';
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

// Confetti particle colors
const CONFETTI_COLORS = ['#b8860b', '#722f37', '#87a96b', '#e07a5f', '#3a86ff', '#f77f00', '#7209b7', '#00b4d8'];

function ConfettiParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
    []);

  return (
    <div className="pdf-confetti-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="pdf-confetti-particle"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function AmbientEmbers() {
  const embers = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${8 + Math.random() * 7}s`,
    })),
    []);

  return (
    <div className="pdf-ambient-embers">
      {embers.map((e) => (
        <div
          key={e.id}
          className="pdf-ember"
          style={{
            left: e.left,
            bottom: '-10px',
            animationDelay: e.delay,
            animationDuration: e.duration,
          }}
        />
      ))}
    </div>
  );
}

function LeaderboardSection({ sortedParticipants, pageCount, userId, myPage, commitPage, setActiveTab }) {
  return (
    <div className="pdf-leaderboard-container">
      <div className="leaderboard-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2>🏆 Reading Leaderboard</h2>
        <p>See who is leading the pack and where everyone is in the book.</p>
      </div>
      
      <div className="leaderboard-grid" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="leaderboard-rankings" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="leaderboard-list">
            {sortedParticipants.map((p, idx) => {
              const isYou = getEntityId(p.userId) === userId;
              const pPage = isYou ? myPage : Number(p.currentPage || 1);
              const finished = Boolean(p.completedAt);
              const pct = pageCount > 0 ? Math.min(100, Math.round((pPage / pageCount) * 100)) : 0;
              
              let rankClass = '';
              if (idx === 0) rankClass = 'rank-gold';
              else if (idx === 1) rankClass = 'rank-silver';
              else if (idx === 2) rankClass = 'rank-bronze';

              return (
                <div key={getEntityId(p.userId)} className={`leaderboard-card ${rankClass} ${isYou ? 'is-you' : ''}`}>
                  <div className="rank-badge">#{idx + 1}</div>
                  <div className="presence-avatar" style={{ background: avatarColor(idx) }}>
                    {(p.username?.[0] || 'R').toUpperCase()}
                  </div>
                  <div className="leaderboard-user-info">
                    <strong>{p.username} {isYou && '(You)'}</strong>
                    <span>{finished ? 'Finished 🎉' : `Page ${pPage} of ${pageCount || '?'}`}</span>
                  </div>
                  <div className="leaderboard-progress-ring">
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PdfReadingRoom() {
  const { groupId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const username = getUsername(user);

  // Refs
  const socketRef = useRef(null);
  const pdfDocRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const scrollTimerRef = useRef(null);

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [group, setGroup] = useState(null);
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [lastActiveUserId, setLastActiveUserId] = useState(null);
  const [annotationsExpanded, setAnnotationsExpanded] = useState(false);

  // Annotations
  const [activeTab, setActiveTab] = useState('room'); // 'room' | 'leaderboard'
  const [reactionEmoji, setReactionEmoji] = useState(REACTION_PRESET[0]);
  const [reactionNote, setReactionNote] = useState('');

  // Celebrations
  const [celebration, setCelebration] = useState(null); // null | 'self' | session object (group)
  const [notifications, setNotifications] = useState([]);

  // Computed
  const participant = useMemo(() => {
    if (!session || !userId) return null;
    return session.participants?.find((p) => getEntityId(p.userId) === userId) || null;
  }, [session, userId]);

  const canAccess = Boolean(group && userId && (group.members || []).some((m) => getEntityId(m) === userId));

  const sortedParticipants = useMemo(() => {
    if (!session?.participants) return [];
    const cp = Number(currentPage || 1);
    return [...session.participants].sort((a, b) => {
      const aIsYou = getEntityId(a.userId) === userId;
      const bIsYou = getEntityId(b.userId) === userId;
      const aPage = aIsYou ? cp : Number(a.currentPage || 1);
      const bPage = bIsYou ? cp : Number(b.currentPage || 1);
      const aFinished = a.completedAt ? 1 : 0;
      const bFinished = b.completedAt ? 1 : 0;
      if (aFinished !== bFinished) return bFinished - aFinished;
      return bPage - aPage;
    });
  }, [session, userId, currentPage]);

  const visibleAnnotations = useMemo(() => {
    if (!session?.annotations) return [];
    const cp = Number(currentPage || 1);
    return session.annotations
      .filter((a) => Number(a.page || 0) === cp)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [session, currentPage]);

  // ---- Notifications ----
  const pushNotify = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [{ id, message, tone }, ...prev].slice(0, 4));
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
  }, []);

  // ---- PDF Rendering ----
  const loadPdf = useCallback(async (pdfUrl) => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

      const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      pdfDocRef.current = doc;
      setPageCount(doc.numPages);
      setPdfLoaded(true);
      return doc;
    } catch (e) {
      console.error('PDF Load Error:', e);
      setError('Failed to load PDF: ' + (e?.message || 'Unknown error'));
      return null;
    }
  }, []);

  const handleEndSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${session?._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?._id || user?.id }),
      });
      if (res.ok) {
        navigate(`/groups/${groupId}`);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to end session');
        setShowEndModal(false);
      }
    } catch (e) {
      setError('Failed to end session');
      setShowEndModal(false);
    }
  };

  const renderPage = useCallback(async (pageNum) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch { }
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      const container = canvas.parentElement;
      const containerWidth = container?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scaleW = (containerWidth - 40) / (unscaledViewport.width || 1);
      const scale = Math.max(0.1, Math.min(scaleW, 1.8));
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') {
        console.error('Render error:', e);
      }
    }
  }, []);

  // ---- API helpers ----
  const commitPage = useCallback(async (nextPage) => {
    if (!session || !participant) return;
    const page = clamp(Number(nextPage || 1), 1, pageCount || 9999);
    if (page !== currentPage) {
      setIsTurning(true);
      setTimeout(() => setIsTurning(false), 400);
    }
    setCurrentPage(page);

    // Debounce server update
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/${session._id}/page`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, username, currentPage: page }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Page update failed');
        setSession(data.session);

        socketRef.current?.emit('scroll_update', {
          sessionId: session._id,
          groupId,
          userId,
          username,
          currentPage: page,
        });

        // Check if finished
        if (pageCount > 0 && page >= pageCount) {
          socketRef.current?.emit('reader_completed', {
            sessionId: session._id, groupId, userId, username, currentPage: page,
          });
          socketRef.current?.emit('check_all_completed', {
            sessionId: session._id, groupId, userId, username,
          });
          setCelebration('self');
        }
      } catch (e) {
        setError(e?.message || 'Unable to update page');
      }
    }, 600);
  }, [session, participant, pageCount, userId, username, groupId]);

  const dropAnnotation = useCallback(async () => {
    if (!session || !participant) return;
    const page = Number(currentPage || 1);

    try {
      const res = await fetch(`${API_BASE}/api/sessions/${session._id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, page, emoji: reactionEmoji, note: reactionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Annotation failed');

      setSession(data.session);
      setReactionNote('');

      socketRef.current?.emit('annotation_added', {
        sessionId: session._id,
        groupId,
        userId,
        username,
        page,
        emoji: reactionEmoji,
        note: reactionNote,
        skipSave: true,
        annotation: data.reaction,
      });

      pushNotify('Annotation added! 📝', 'success');
    } catch (e) {
      setError(e?.message || 'Unable to add annotation');
    }
  }, [session, participant, currentPage, userId, username, groupId, reactionEmoji, reactionNote, pushNotify]);

  // ---- Initial load ----
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');

        const [groupRes, sessionRes] = await Promise.all([
          fetch(`${API_BASE}/api/groups/${groupId}`),
          fetch(`${API_BASE}/api/sessions/group/${groupId}`),
        ]);

        if (!groupRes.ok) throw new Error((await groupRes.json())?.message || 'Group load failed');
        if (!sessionRes.ok) throw new Error((await sessionRes.json())?.message || 'Session load failed');

        const groupData = await groupRes.json();
        const sessionData = await sessionRes.json();
        const sess = sessionData.session || null;

        if (cancelled) return;
        setGroup(groupData);
        setSession(sess);

        if (sess) {
          const me = sess.participants?.find((p) => getEntityId(p.userId) === userId);
          setCurrentPage(Number(me?.currentPage || 1));
          setPageCount(Number(sess.pageCount || 0));

          // Join the session if not a participant
          if (!me) {
            const joinRes = await fetch(`${API_BASE}/api/sessions/${sess._id}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, username }),
            });
            if (joinRes.ok) {
              const joinData = await joinRes.json();
              if (!cancelled) setSession(joinData.session);
            }
          }

          // Load PDF
          if (sess.bookId?.filename) {
            const pdfUrl = `${API_BASE}/uploads/library/${sess.bookId.filename}`;
            await loadPdf(pdfUrl);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Unable to load reading room');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [groupId, sessionId, userId, username, loadPdf]);

  // ---- Render page when it changes ----
  useEffect(() => {
    if (pdfLoaded && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfLoaded, currentPage, renderPage]);

  // ---- Socket events ----
  useEffect(() => {
    if (!userId || !session?._id) return;

    const socket = getChatSocket(userId);
    socketRef.current = socket;

    const onPageUpdated = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (payload.session) setSession(payload.session);
      if (payload.userId && getEntityId(payload.userId) !== userId) {
        setLastActiveUserId(getEntityId(payload.userId));
        setTimeout(() => setLastActiveUserId(null), 3000);
      }
    };

    const onAnnotationAdded = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (payload.session) setSession(payload.session);
      else if (payload.annotation) {
        setSession((prev) => {
          if (!prev) return prev;
          const existing = prev.annotations || [];
          return { ...prev, annotations: [...existing, payload.annotation] };
        });
      }
    };

    const onReaderJoined = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      pushNotify(`${payload.username || 'Someone'} joined the room 📖`, 'info');
      
      setSession((prev) => {
        if (!prev) return prev;
        const exists = prev.participants?.some(p => getEntityId(p.userId) === getEntityId(payload.userId));
        if (exists) return prev;
        
        return {
          ...prev,
          participants: [
            ...(prev.participants || []),
            {
              userId: payload.userId,
              username: payload.username,
              currentPage: 1,
              joinedAt: new Date().toISOString()
            }
          ]
        };
      });
    };

    const onReaderFinished = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (getEntityId(payload.userId) !== userId) {
        pushNotify(`${payload.username || 'Someone'} finished the book! 🎉`, 'finish');
      }
    };

    const onSessionCompleted = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (payload.session) setSession(payload.session);
      setCelebration(payload.session || session);
    };

    socket.on('page_updated', onPageUpdated);
    socket.on('annotation_added', onAnnotationAdded);
    socket.on('reader_joined', onReaderJoined);
    socket.on('reader_finished', onReaderFinished);
    socket.on('session_completed', onSessionCompleted);

    socket.emit('join_reading_room', { groupId, sessionId: session._id, userId, username });

    return () => {
      socket.emit('leave_reading_room', { groupId, sessionId: session._id });
      socket.off('page_updated', onPageUpdated);
      socket.off('annotation_added', onAnnotationAdded);
      socket.off('reader_joined', onReaderJoined);
      socket.off('reader_finished', onReaderFinished);
      socket.off('session_completed', onSessionCompleted);
    };
  }, [groupId, session?._id, userId, username, pushNotify]);

  // ---- Keyboard nav ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        commitPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        commitPage(currentPage - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, commitPage]);

  // ---- Guards ----
  if (!user) {
    return (
      <GuestGate
        title="Reading Room Access"
        message="Sign in to join live reading sessions and track your page progress with your group."
        icon="fas fa-book-open-reader"
        loginText="Log In"
        signupText="Join ShelfTalk"
      />
    );
  }

  if (loading) {
    return (
      <div className="reading-room-page">
        <div className="reading-room-card reading-room-loading">
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📖</div>
          Loading reading room...
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="reading-room-page">
        <div className="reading-room-card reading-room-error">
          <h2>Reading room unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/groups')} className="reading-room-primary-btn">
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="reading-room-page">
        <div className="reading-room-card reading-room-empty">
          <h2>{group?.name || 'Reading Room'}</h2>
          <p>You need to join this group before entering the reading room.</p>
          <button type="button" className="reading-room-secondary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
            Open Group Page
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="reading-room-page">
        <div className="reading-room-shell">
          <div className="reading-room-card reading-room-empty" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📚</div>
            <h2>No active reading session</h2>
            <p>Go back to the group page and start a reading session from the Library tab.</p>
            <button type="button" className="reading-room-primary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
              Back to Group
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myPage = Number(currentPage || 1);
  const progress = pageCount > 0 ? Math.min(100, Math.round((myPage / pageCount) * 100)) : 0;

  const isCreator = getEntityId(group?.createdBy) === userId;
  const isMod = group?.moderators?.some((m) => getEntityId(m._id || m) === userId);
  const isHost = getEntityId(session?.hostedBy) === userId;
  const canEndSession = isCreator || isMod || isHost;

  return (
    <div className="reading-room-page">
      <AmbientEmbers />

      <div className="reading-room-shell">
        {/* Header */}
        <header className="reading-room-hero">
          <div>
            <div className="reading-room-kicker">
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#87a96b', marginRight: 6, animation: 'pdf-emoji-bounce 2s ease infinite' }} />
              Live Reading Room
            </div>
            <h1>{session?.title || group?.name || 'Reading Room'}</h1>
            <div className="reading-room-meta">{sortedParticipants.length} reader{sortedParticipants.length !== 1 ? 's' : ''} • Page {myPage}{pageCount ? ` / ${pageCount}` : ''} • {progress}% complete</div>
          </div>
          <div className="reading-room-hero-actions">
            {canEndSession && (
              <button type="button" className="end-session-btn" onClick={() => setShowEndModal(true)}>
                End Session
              </button>
            )}
            <button type="button" className="reading-room-secondary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
              ← Back to Group
            </button>
          </div>
        </header>

        {error && <div className="reading-room-banner reading-room-banner-error">{error}</div>}

        {/* Tab Toggle */}
        <div className="room-tab-toggle-container">
          <div className={`room-tab-btn ${activeTab === 'room' ? 'active' : ''}`} onClick={() => setActiveTab('room')}>
            📖 Reading Room
          </div>
          <div className={`room-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            🏆 Leaderboard
          </div>
        </div>

        {activeTab === 'room' && (
          <div className="pdf-room-layout">

          {/* PDF Viewer */}
          <div className="pdf-viewer-panel">
            <div className="pdf-viewer-header">
              <div className="book-inner-title">{session?.title || 'Book'}</div>
              <span className="page-indicator-badge">PAGE {myPage}{pageCount ? ` OF ${pageCount}` : ''}</span>
            </div>

            <div className={`pdf-canvas-wrap ${isTurning ? 'turning' : ''}`} style={{ position: 'relative' }}>
              {/* Click Zones */}
              <div
                className="pdf-click-zone pdf-click-zone-left"
                onClick={() => { if (myPage > 1) commitPage(myPage - 1); }}
                title="Previous page"
              />
              <div
                className="pdf-click-zone pdf-click-zone-right"
                onClick={() => { if (!pageCount || myPage < pageCount) commitPage(myPage + 1); }}
                title="Next page"
              />

              <canvas ref={canvasRef} />

              {/* Emoji Pins on Right Edge */}
              <div className="emoji-pins-container">
                {visibleAnnotations.slice(0, 3).map((a, idx) => (
                  <div key={`pin-${idx}`} className="emoji-pin">
                    {a.emoji}
                    <div className="emoji-pin-tooltip">
                      <strong>{a.username}</strong>: {a.note || a.emoji}
                    </div>
                  </div>
                ))}
                {visibleAnnotations.length > 3 && (
                  <div className="emoji-pin" style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#6b3a2a' }}>
                    +{visibleAnnotations.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="page-nav-floating">
              <button
                type="button"
                className="page-nav-btn"
                disabled={myPage <= 1}
                onClick={() => commitPage(myPage - 1)}
                title="Previous page (← or A)"
              >
                ◀
              </button>

              {isEditingPage ? (
                <input
                  type="number"
                  min={1}
                  max={pageCount || 999}
                  defaultValue={myPage}
                  onBlur={(e) => {
                    commitPage(Number(e.target.value));
                    setIsEditingPage(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitPage(Number(e.target.value));
                      setIsEditingPage(false);
                    }
                  }}
                  autoFocus
                  className="page-jump-input"
                />
              ) : (
                <span
                  className="page-nav-display"
                  onClick={() => setIsEditingPage(true)}
                  title="Click to jump to page"
                >
                  {myPage} / {pageCount || '—'}
                </span>
              )}

              <button
                type="button"
                className="page-nav-btn"
                disabled={pageCount > 0 && myPage >= pageCount}
                onClick={() => commitPage(myPage + 1)}
                title="Next page (→ or D)"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Annotations Side Panel */}
          <div className="pdf-side-column">
            <div className="annotations-side-panel">
              <h3 style={{ margin: '0 0 16px', fontFamily: 'Crimson Text', color: '#c9a84c', fontSize: '1.2rem' }}>
                📌 {visibleAnnotations.length} Annotation{visibleAnnotations.length !== 1 ? 's' : ''} on p.{myPage}
              </h3>

              <div className="annotations-content">
                {visibleAnnotations.length === 0 && (
                  <div className="annotation-empty-state">
                    No annotations on this page yet. Be the first to leave a thought!
                  </div>
                )}

                {visibleAnnotations.length > 0 && (
                  <div className="pdf-annotation-timeline">
                    {visibleAnnotations.slice(0, 20).map((a, idx) => (
                      <div key={`${a.createdAt || idx}-${idx}`} className="pdf-annotation-item" style={{ background: 'rgba(253,250,246,0.1)', borderColor: 'rgba(201,168,76,0.2)' }}>
                        <span className="pdf-annotation-emoji">{a.emoji}</span>
                        <div className="pdf-annotation-body">
                          <strong style={{ color: '#8b5e00' }}>{a.username}</strong>
                          {a.note ? <p style={{ color: '#1a1a1a', margin: '4px 0 0' }}>{a.note}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pdf-annotation-form" style={{ marginTop: 16 }}>
                  <div className="annotation-empty-emojis" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                    {REACTION_PRESET.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setReactionEmoji(emoji)}
                        style={{
                          background: reactionEmoji === emoji ? 'rgba(201,168,76,0.25)' : 'rgba(114,47,55,0.1)',
                          borderColor: reactionEmoji === emoji ? '#c9a84c' : 'rgba(201,168,76,0.3)',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="pdf-annotation-input-row">
                    <input
                      type="text"
                      value={reactionNote}
                      maxLength={140}
                      onChange={(e) => setReactionNote(e.target.value)}
                      placeholder={`Note for p.${myPage}...`}
                      onKeyDown={(e) => { if (e.key === 'Enter') dropAnnotation(); }}
                      style={{ background: 'rgba(255, 254, 247, 0.9)', color: '#1a1a1a', border: '1px solid rgba(201,168,76,0.8)' }}
                    />
                    <button type="button" onClick={dropAnnotation} style={{ background: '#6b3a2a', color: '#c9a84c', border: '1px solid #c9a84c' }}>
                      {reactionEmoji} Add Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardSection sortedParticipants={sortedParticipants} pageCount={pageCount} userId={userId} myPage={myPage} commitPage={commitPage} setActiveTab={setActiveTab} />
        )}
      </div>

      {/* Toast notifications */}
      <div className="pdf-toast-stack">
        {notifications.map((n) => (
          <div key={n.id} className={`pdf-toast ${n.tone}`}>{n.message}</div>
        ))}
      </div>

      {/* Self-completion celebration */}
      {celebration === 'self' && (
        <div className="pdf-confetti-overlay" onClick={() => setCelebration(null)}>
          <div className="pdf-confetti-card" onClick={(e) => e.stopPropagation()}>
            <ConfettiParticles />
            <div className="pdf-confetti-emoji">🎉</div>
            <h2>You finished!</h2>
            <p>Congratulations on completing {session?.title || 'the book'}!</p>
            <button type="button" className="pdf-confetti-close" onClick={() => setCelebration(null)}>
              Continue Reading Room
            </button>
          </div>
        </div>
      )}

      {/* Group completion celebration */}
      {celebration && celebration !== 'self' && typeof celebration === 'object' && (
        <div className="pdf-confetti-overlay" onClick={() => setCelebration(null)}>
          <div className="pdf-confetti-card" onClick={(e) => e.stopPropagation()}>
            <ConfettiParticles />
            <div className="pdf-confetti-emoji">🏆</div>
            <h2>Session Complete!</h2>
            <p>Everyone finished {celebration.title || session?.title || 'the book'}!</p>
            <div className="pdf-confetti-participants">
              {(celebration.participants || session?.participants || []).map((p) => (
                <span key={getEntityId(p.userId)}>📖 {p.username}</span>
              ))}
            </div>
            <button type="button" className="pdf-confetti-close" onClick={() => setCelebration(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndModal && (
        <div className="pdf-confetti-overlay" onClick={() => setShowEndModal(false)} style={{ zIndex: 1000 }}>
          <div className="pdf-confetti-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px' }}>
            <div className="pdf-confetti-emoji" style={{ animation: 'none', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ marginBottom: '8px' }}>End Reading Session?</h2>
            <p style={{ color: '#4b5563', marginBottom: '24px' }}>
              Are you sure you want to end this live reading session? This will safely remove everyone from the room and complete the session.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="reading-room-secondary-btn"
                onClick={() => setShowEndModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reading-room-primary-btn"
                style={{ background: '#ef4444', borderColor: '#dc2626' }}
                onClick={handleEndSession}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
