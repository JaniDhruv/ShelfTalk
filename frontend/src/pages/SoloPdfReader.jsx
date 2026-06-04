import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuestGate from '../components/GuestGate';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import './ReadingRoom.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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
      try { renderTaskRef.current.cancel(); } catch {}
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
    setCurrentPage(page);
    if (bookId && userId) {
      localStorage.setItem(`solo_read_${userId}_${bookId}`, page.toString());
    }
  }, [pageCount, bookId, userId]);

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
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        commitPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
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
      <div className="reading-room-ambient reading-room-ambient-one" />
      <div className="reading-room-ambient reading-room-ambient-two" />

      <div className="reading-room-shell">
        {/* Header */}
        <header className="reading-room-hero">
          <div>
            <div className="reading-room-kicker" style={{ color: '#87a96b' }}>
              <i className="fas fa-book-reader" style={{ marginRight: 6 }}></i>
              Solo Reading
            </div>
            <h1>{book?.title || book?.originalName || 'Book'}</h1>
            <p>Page {myPage}{pageCount ? ` / ${pageCount}` : ''} • {progress}% complete</p>
          </div>
          <div className="reading-room-hero-actions">
            <button type="button" className="reading-room-secondary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
              ← Back to Group
            </button>
          </div>
        </header>

        {error && <div className="reading-room-banner reading-room-banner-error">{error}</div>}

        {/* Main layout */}
        <div className="pdf-room-layout solo-layout">
          <div className="pdf-viewer-panel">
            <div className="pdf-viewer-header">
              <strong>{book?.title || 'Book'}</strong>
              <span>Page {myPage}{pageCount ? ` of ${pageCount}` : ''}</span>
            </div>

            <div style={{ height: 4, background: 'rgba(114,47,55,0.06)' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #722f37, #b8860b)',
                borderRadius: '0 2px 2px 0',
                transition: 'width 0.4s ease',
              }} />
            </div>

            <div className="pdf-canvas-wrap">
              <canvas ref={canvasRef} />
            </div>

            <div className="pdf-page-nav">
              <button
                type="button"
                className="reading-room-page-btn"
                disabled={myPage <= 1}
                onClick={() => commitPage(myPage - 1)}
                title="Previous page (←)"
              >
                ‹
              </button>
              <input
                type="number"
                min={1}
                max={pageCount || undefined}
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                onBlur={(e) => commitPage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitPage(e.target.value); }}
                className="reading-room-page-input"
              />
              <span className="pdf-page-total">/ {pageCount || '—'}</span>
              <button
                type="button"
                className="reading-room-page-btn"
                disabled={pageCount > 0 && myPage >= pageCount}
                onClick={() => commitPage(myPage + 1)}
                title="Next page (→)"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
