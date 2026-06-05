import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuestGate from '../components/GuestGate';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import './ReadingRoom.css';

import './ReadingRoom.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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

export default function SoloPdfReader() {
  const { groupId, bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const pdfDocRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState(null);
  const [book, setBook] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const [isEditingPage, setIsEditingPage] = useState(false);

  // Time tracking for Progress Dashboard
  const [sessionStart] = useState(Date.now());
  const [sessionTimeMs, setSessionTimeMs] = useState(0);
  const [startPage, setStartPage] = useState(null);

  useEffect(() => {
    const int = setInterval(() => {
      setSessionTimeMs(Date.now() - sessionStart);
    }, 1000);
    return () => clearInterval(int);
  }, [sessionStart]);

  const canAccess = Boolean(group && userId && (group.members || []).some((m) => (m._id || m).toString() === userId.toString()));

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

  const renderPage = useCallback(async (pageNum) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch { }
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      const container = canvas.parentElement;
      const containerWidth = container?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = Math.min((containerWidth - 20) / unscaledViewport.width, 1.8);
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') console.error('Render error:', e);
    }
  }, []);

  const commitPage = useCallback((nextPage) => {
    const page = clamp(Number(nextPage || 1), 1, pageCount || 9999);
    if (page !== currentPage) {
      setIsTurning(true);
      setTimeout(() => setIsTurning(false), 400);
    }
    setCurrentPage(page);
    if (bookId && userId) {
      localStorage.setItem(`solo_read_${userId}_${bookId}`, page.toString());
    }
  }, [pageCount, bookId, userId, currentPage]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [groupRes, libraryRes] = await Promise.all([
          fetch(`${API_BASE}/api/groups/${groupId}`),
          fetch(`${API_BASE}/api/groups/${groupId}/library?userId=${userId}`)
        ]);

        if (!groupRes.ok) throw new Error('Group load failed');
        if (!libraryRes.ok) throw new Error('Library load failed');

        const groupData = await groupRes.json();
        const libData = await libraryRes.json();

        if (cancelled) return;
        setGroup(groupData);

        const targetBook = libData.books.find(b => b._id.toString() === bookId);
        if (!targetBook) throw new Error('Book not found in library');

        setBook(targetBook);

        const savedPage = localStorage.getItem(`solo_read_${userId}_${bookId}`);
        if (savedPage) {
          setCurrentPage(Number(savedPage));
          setStartPage(Number(savedPage));
        } else {
          setStartPage(1);
        }

        if (targetBook.filename) {
          const pdfUrl = `${API_BASE}/uploads/library/${targetBook.filename}`;
          await loadPdf(pdfUrl);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Unable to load reading room');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, bookId, userId, loadPdf]);

  useEffect(() => {
    if (pdfLoaded && currentPage > 0) renderPage(currentPage);
  }, [pdfLoaded, currentPage, renderPage]);

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

  if (!user) {
    return (
      <GuestGate
        title="Solo Reading"
        message="Sign in to read books."
        icon="fas fa-book-reader"
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
          Loading solo reader...
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="reading-room-page">
        <div className="reading-room-card reading-room-error">
          <h2>Reader unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => navigate(`/groups/${groupId}`)} className="reading-room-primary-btn">
            Back to Group
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

  const myPage = Number(currentPage || 1);
  const progress = pageCount > 0 ? Math.min(100, Math.round((myPage / pageCount) * 100)) : 0;

  return (
    <div className="reading-room-page solo-mode">
      <AmbientEmbers />

      <div className="reading-room-shell">
        {/* Header */}
        <header className="reading-room-hero">
          <div>
            <div className="solo-reading-badge">
              <i className="fas fa-book-reader"></i>
              Solo Reading
            </div>
            <h1>{book?.title || book?.originalName || 'Book'}</h1>
          </div>
          <div className="reading-room-hero-actions">
            <button type="button" className="reading-room-secondary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
              ← Back to Group
            </button>
          </div>
        </header>

        {error && <div className="reading-room-banner reading-room-banner-error">{error}</div>}

        {/* Progress Dashboard */}
        <div className="progress-dashboard">
          <div className="progress-dash-header">
            <div style={{ fontFamily: 'Crimson Text, serif', fontSize: '1.05rem', color: '#c9a84c' }}>
              <strong>📖 {book?.title || 'Book'}</strong>
            </div>
            <div style={{ fontFamily: 'Crimson Text, serif', color: '#fdfaf6' }}>
              {progress}% · Page {myPage} of {pageCount}
            </div>
          </div>

          <div className="progress-dash-bar-bg">
            <div className="progress-dash-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.85rem', color: 'rgba(201,168,76,0.8)' }}>
            <div>
              ⏱ Reading for {Math.floor(sessionTimeMs / 60000) > 0 ? `${Math.floor(sessionTimeMs / 60000)} min` : '< 1 min'}
              {(() => {
                const pagesReadThisSession = Math.max(0, myPage - (startPage || 1));
                const pagesRemaining = Math.max(0, pageCount - myPage);
                if (pagesReadThisSession >= 1 && pagesRemaining > 0) {
                  const msPerPage = sessionTimeMs / pagesReadThisSession;
                  const minsLeft = Math.ceil((msPerPage * pagesRemaining) / 60000);
                  return ` · ~${minsLeft} min left at your pace`;
                }
                return '';
              })()}
            </div>
            <div>📄 {Math.max(0, pageCount - myPage)} pages left</div>
          </div>
        </div>

        {/* Main layout */}
        <div className="pdf-room-layout solo-layout">
          <div className="pdf-viewer-panel">
            <div className="pdf-viewer-header">
              <div className="book-inner-title">{book?.title || 'Book'}</div>
              <span className="page-indicator-badge">PAGE {myPage}{pageCount ? ` OF ${pageCount}` : ''}</span>
            </div>

            <div className={`pdf-canvas-wrap ${isTurning ? 'turning' : ''}`}>
              <canvas ref={canvasRef} />
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
        </div>
      </div>
    </div>
  );
}
