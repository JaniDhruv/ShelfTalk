import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuestGate from '../components/GuestGate';
import BookSearch from '../components/BookSearch';
import { getChatSocket } from '../lib/socket';
import './ReadingRoom.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const REACTIONS = ['😮', '😭', '😂', '🔥', '❤️', '😱', '🤯', '👏', '💔', '⚡'];

const getEntityId = (value) => {
  if (!value) return '';
  return (value._id || value.id || value).toString();
};

const getUsername = (user) => user?.username || user?.name || 'Reader';

const buildRoomMessage = (session) => {
  if (!session) return 'No active reading session yet.';
  return `${session.participants?.length || 0} reader${(session.participants?.length || 0) === 1 ? '' : 's'} in the room`;
};

export default function ReadingRoom() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const username = getUsername(user);
  const socketRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pageInput, setPageInput] = useState(1);
  const [reactionEmoji, setReactionEmoji] = useState(REACTIONS[0]);
  const [reactionNote, setReactionNote] = useState('');
  const [visibleReactions, setVisibleReactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [celebration, setCelebration] = useState(null);

  const currentParticipant = useMemo(() => {
    if (!session || !userId) return null;
    return session.participants?.find((participant) => getEntityId(participant.userId) === userId) || null;
  }, [session, userId]);

  const isMember = Boolean(group && userId && (group.members || []).some((member) => getEntityId(member) === userId));
  const isOwner = Boolean(group && userId && getEntityId(group.createdBy) === userId);
  const isModerator = Boolean(group && userId && (group.moderators || []).some((member) => getEntityId(member) === userId));
  const canManageSession = isOwner || isModerator;
  const hasActiveSession = Boolean(session && session.status === 'active');
  const isParticipant = Boolean(currentParticipant);
  const totalPages = Number(session?.pageCount || 0);

  const pushNotification = (message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((items) => [{ id, message, tone }, ...items].slice(0, 4));
    window.clearTimeout(pushNotification._timeout);
    pushNotification._timeout = window.setTimeout(() => {
      setNotifications((items) => items.filter((item) => item.id !== id));
    }, 5000);
  };

  const fetchReadingRoom = async () => {
    try {
      setLoading(true);
      setError('');
      const [groupResponse, sessionResponse] = await Promise.all([
        fetch(`${API_BASE}/api/groups/${groupId}`),
        fetch(`${API_BASE}/api/sessions/group/${groupId}`),
      ]);

      const groupData = await groupResponse.json();
      if (!groupResponse.ok) {
        throw new Error(groupData.message || 'Failed to load group');
      }

      const sessionData = await sessionResponse.json();
      if (!sessionResponse.ok) {
        throw new Error(sessionData.message || 'Failed to load reading session');
      }

      setGroup(groupData);
      setSession(sessionData.session || null);
    } catch (err) {
      setError(err.message || 'Unable to load reading room');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisibleReactions = async (activeSession = session, participant = currentParticipant) => {
    if (!activeSession || !participant || !userId) {
      setVisibleReactions([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/sessions/${activeSession._id}/reactions/${participant.currentPage || 1}?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setVisibleReactions(data.reactions || []);
      }
    } catch {
      setVisibleReactions([]);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchReadingRoom();
  }, [groupId, userId]);

  useEffect(() => {
    if (!session || !currentParticipant) return;
    setPageInput(currentParticipant.currentPage || 1);
    fetchVisibleReactions(session, currentParticipant);
  }, [session, currentParticipant?.currentPage, userId]);

  useEffect(() => {
    if (!userId) return undefined;

    const socket = getChatSocket(userId);
    socketRef.current = socket;

    const onReaderJoined = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      refreshSession();
      pushNotification(`${payload.username || 'Someone'} joined the room`, 'info');
    };

    const onReaderLeft = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      refreshSession();
    };

    const onPageUpdated = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (payload.session) {
        setSession(payload.session);
        const nextParticipant = (payload.session.participants || []).find((participant) => getEntityId(participant.userId) === userId);
        if (nextParticipant) {
          setPageInput(nextParticipant.currentPage || 1);
          fetchVisibleReactions(payload.session, nextParticipant);
        }
      }
    };

    const onReactionDropped = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      if (payload.reaction) {
        setVisibleReactions((current) => {
          const alreadyExists = current.some((item) => (
            getEntityId(item.userId) === getEntityId(payload.reaction.userId)
            && Number(item.page || 0) === Number(payload.reaction.page || 0)
            && item.emoji === payload.reaction.emoji
            && String(item.note || '') === String(payload.reaction.note || '')
            && String(item.createdAt || '') === String(payload.reaction.createdAt || '')
          ));
          if (alreadyExists) return current;

          const next = [...current, payload.reaction];
          next.sort((a, b) => Number(a.page || 0) - Number(b.page || 0) || new Date(a.createdAt) - new Date(b.createdAt));
          return next;
        });
      }
    };

    const onReaderFinished = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      pushNotification(`${payload.username || 'Someone'} finished the book!`, 'finish');
    };

    const onSessionCompleted = (payload) => {
      if (!payload || getEntityId(payload.sessionId) !== getEntityId(session?._id)) return;
      setSession((current) => (current ? { ...current, status: 'completed', completedAt: payload.session?.completedAt || new Date().toISOString() } : current));
      setCelebration(payload.session || session);
    };

    socket.on('reader_joined', onReaderJoined);
    socket.on('reader_left', onReaderLeft);
    socket.on('page_updated', onPageUpdated);
    socket.on('reaction_dropped', onReactionDropped);
    socket.on('reader_finished', onReaderFinished);
    socket.on('session_completed', onSessionCompleted);

    socket.emit('join_reading_room', {
      groupId,
      sessionId: session?._id,
      userId,
      username,
    }, (ack) => {
      // Ensure session state is loaded immediately for the joining user and for new participants.
      if (ack?.ok && ack?.session) {
        setSession(ack.session);
      }
    });

    return () => {
      socket.emit('leave_reading_room', { groupId, sessionId: session?._id });
      socket.off('reader_joined', onReaderJoined);
      socket.off('reader_left', onReaderLeft);
      socket.off('page_updated', onPageUpdated);
      socket.off('reaction_dropped', onReactionDropped);
      socket.off('reader_finished', onReaderFinished);
      socket.off('session_completed', onSessionCompleted);
    };
  }, [groupId, session?._id, userId]);

  const startSession = async () => {
    if (!selectedBook || !userId) return;
    setStarting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, userId, username, book: selectedBook }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to start session');
      }
      setSession(data.session);
      setShowStartModal(false);
      setSelectedBook(null);
      pushNotification(`Started ${selectedBook.title}`, 'info');
      await fetchVisibleReactions(data.session, { currentPage: 1 });
    } catch (err) {
      setError(err.message || 'Unable to start session');
    } finally {
      setStarting(false);
    }
  };

  const joinSession = async () => {
    if (!session || !userId) return;
    setJoining(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${session._id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to join session');
      }
      setSession(data.session);
      pushNotification('You joined the reading room', 'info');
    } catch (err) {
      setError(err.message || 'Unable to join session');
    } finally {
      setJoining(false);
    }
  };

  const commitPageUpdate = async (nextPage) => {
    if (!session || !currentParticipant) return;
    const pageNumber = Math.max(1, Math.min(Number(nextPage || 1), totalPages || Number(nextPage || 1)));
    setPageInput(pageNumber);

    try {
      const response = await fetch(`${API_BASE}/api/sessions/${session._id}/page`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, currentPage: pageNumber }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to update your page');
      }

      setSession(data.session);
      socketRef.current?.emit('update_page', {
        sessionId: session._id,
        groupId,
        userId,
        username,
        currentPage: pageNumber,
      });

      if (totalPages > 0 && pageNumber >= totalPages) {
        socketRef.current?.emit('reader_completed', {
          sessionId: session._id,
          groupId,
          userId,
          username,
          currentPage: pageNumber,
        });
        socketRef.current?.emit('check_all_completed', {
          sessionId: session._id,
          groupId,
          userId,
          username,
        });
      }

      await fetchVisibleReactions(data.session, data.participant || { currentPage: pageNumber });
    } catch (err) {
      setError(err.message || 'Unable to update your page');
    }
  };

  const dropReaction = async () => {
    if (!session || !currentParticipant) return;
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${session._id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          page: currentParticipant.currentPage,
          emoji: reactionEmoji,
          note: reactionNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to save reaction');
      }

      setSession(data.session);
      setReactionNote('');
      socketRef.current?.emit('drop_reaction', {
        sessionId: session._id,
        groupId,
        userId,
        username,
        page: currentParticipant.currentPage,
        emoji: reactionEmoji,
        note: reactionNote,
        reaction: data.reaction,
        skipSave: true,
      });

      await fetchVisibleReactions(data.session, currentParticipant);
    } catch (err) {
      setError(err.message || 'Unable to save reaction');
    }
  };

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
        <div className="reading-room-card reading-room-loading">Loading reading room...</div>
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

  if (!isMember) {
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

  console.log("STATUS", session?.status);
console.log("PAGECOUNT", session?.pageCount);

  return (
    <div className="reading-room-page">
      <div className="reading-room-ambient reading-room-ambient-one"></div>
      <div className="reading-room-ambient reading-room-ambient-two"></div>

      <div className="reading-room-shell">
        <header className="reading-room-hero">
          <div>
            <div className="reading-room-kicker">Live Reading Room</div>
            <h1>{group?.name || 'Reading Room'}</h1>
            <p>{session ? buildRoomMessage(session) : 'Create a shared reading session for your group.'}</p>
          </div>
          <div className="reading-room-hero-actions">
            <button type="button" className="reading-room-secondary-btn" onClick={() => navigate(`/groups/${groupId}`)}>
              Back to Group
            </button>
            {!hasActiveSession && canManageSession && (
              <button type="button" className="reading-room-primary-btn" onClick={() => setShowStartModal(true)}>
                Start Reading Session
              </button>
            )}
            {hasActiveSession && !isParticipant && (
              <button type="button" className="reading-room-primary-btn" onClick={joinSession} disabled={joining}>
                {joining ? 'Joining...' : 'Join Session'}
              </button>
            )}
          </div>
        </header>

        {error && <div className="reading-room-banner reading-room-banner-error">{error}</div>}

        {!hasActiveSession ? (
          <section className="reading-room-empty-state">
            <div className="reading-room-card reading-room-empty-session">
              <span className="reading-room-empty-icon">📚</span>
              <h2>No active session right now</h2>
              <p>{canManageSession ? 'Pick a book to open the next group reading room.' : 'Only the owner or a moderator can start the next session.'}</p>
              {canManageSession && (
                <button type="button" className="reading-room-primary-btn" onClick={() => setShowStartModal(true)}>
                  Start Reading Session
                </button>
              )}
            </div>
          </section>
        ) : !isParticipant ? (
          <section className="reading-room-preview-grid">
            <article className="reading-room-card reading-room-book-preview">
              <div className="reading-room-book-cover">
                {session.coverImage ? <img src={session.coverImage} alt={session.title} /> : <span>{session.title?.[0] || 'B'}</span>}
              </div>
              <div>
                <h2>{session.title}</h2>
                <p>{(session.authors || []).join(', ') || 'Unknown author'}</p>
                <span>{session.pageCount ? `${session.pageCount} pages` : 'Page count unavailable'}</span>
              </div>
            </article>
            <article className="reading-room-card reading-room-preview-panel">
              <h3>Who is reading</h3>
              <div className="reading-room-reader-list">
                {(session.participants || []).map((participant) => (
                  <div key={getEntityId(participant.userId)} className="reading-room-preview-reader">
                    <span className="reading-room-avatar">{(participant.username?.[0] || 'R').toUpperCase()}</span>
                    <div>
                      <strong>{participant.username}</strong>
                      <p>Page {participant.currentPage || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : (
          <div className="reading-room-grid">
            <section className="reading-room-card reading-room-book-header">
              <div className="reading-room-book-cover reading-room-book-cover-large">
                {session.coverImage ? <img src={session.coverImage} alt={session.title} /> : <span>{session.title?.[0] || 'B'}</span>}
              </div>
              <div className="reading-room-book-meta">
                <span className="reading-room-label">Current Book</span>
                <h2>{session.title}</h2>
                <p>{(session.authors || []).join(', ') || 'Unknown author'}</p>
                <div className="reading-room-book-stats">
                  <span>{totalPages ? `${totalPages} pages` : 'Page count unavailable'}</span>
                  <span>{currentParticipant?.completedAt ? 'Finished' : `At page ${currentParticipant?.currentPage || 1}`}</span>
                </div>
              </div>
            </section>

            <section className="reading-room-card reading-room-progress-card">
              <div className="reading-room-section-title">
                <h3>Your Progress</h3>
                <span>{totalPages ? `${Math.round(((currentParticipant?.currentPage || 1) / totalPages) * 100)}%` : 'Reading'}</span>
              </div>
              <div className="reading-room-progress-track">
                <div
                  className="reading-room-progress-fill"
                  style={{ width: totalPages ? `${Math.min(100, Math.round(((currentParticipant?.currentPage || 1) / totalPages) * 100))}%` : '100%' }}
                ></div>
              </div>
              <div className="reading-room-page-controls">
                <button type="button" onClick={() => commitPageUpdate((currentParticipant?.currentPage || 1) - 1)} className="reading-room-page-btn">−</button>
                <input
                  type="number"
                  min="1"
                  max={totalPages || undefined}
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  onBlur={(event) => commitPageUpdate(event.target.value)}
                  className="reading-room-page-input"
                />
                <button type="button" onClick={() => commitPageUpdate((currentParticipant?.currentPage || 1) + 1)} className="reading-room-page-btn">+</button>
              </div>
            </section>

            <section className="reading-room-card reading-room-participants-card">
              <div className="reading-room-section-title">
                <h3>Live Participants</h3>
                <span>{(session.participants || []).length} connected</span>
              </div>
              <div className="reading-room-participant-list">
                {(session.participants || []).map((participant) => {
                  const participantPage = Number(participant.currentPage || 1);
                  const myPage = Number(currentParticipant?.currentPage || 1);
                  const relation = participantPage > myPage ? 'ahead' : participantPage < myPage ? 'behind' : 'same';
                  const finished = Boolean(participant.completedAt);
                  const percent = totalPages ? Math.min(100, Math.round((participantPage / totalPages) * 100)) : 0;

                  return (
                    <article key={getEntityId(participant.userId)} className="reading-room-participant">
                      <div className="reading-room-avatar reading-room-avatar-large">{(participant.username?.[0] || 'R').toUpperCase()}</div>
                      <div className="reading-room-participant-copy">
                        <div className="reading-room-participant-topline">
                          <strong>{participant.username}</strong>
                          {finished ? <span className="reading-room-finished-badge">Finished</span> : null}
                        </div>
                        <div className="reading-room-participant-meta">
                          <span>Page {participantPage}</span>
                          <span>{percent}%</span>
                          <span className={`reading-room-rel ${relation}`}>{relation === 'ahead' ? '🚀 Ahead' : relation === 'behind' ? '🐢 Behind' : 'Same page'}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="reading-room-card reading-room-reactions-card">
              <div className="reading-room-section-title">
                <h3>Reactions</h3>
                <span>Spoiler-safe timeline</span>
              </div>

              <div className="reading-room-reaction-picker">
                {REACTIONS.map((emoji) => (
                  <button key={emoji} type="button" className={`reading-room-emoji ${reactionEmoji === emoji ? 'active' : ''}`} onClick={() => setReactionEmoji(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="reading-room-reaction-composer">
                <input
                  type="text"
                  value={reactionNote}
                  maxLength={140}
                  onChange={(event) => setReactionNote(event.target.value)}
                  placeholder={`Optional note for page ${currentParticipant?.currentPage || 1}`}
                />
                <button type="button" className="reading-room-primary-btn" onClick={dropReaction}>
                  Drop Reaction at Page {currentParticipant?.currentPage || 1}
                </button>
              </div>

              <div className="reading-room-timeline">
                {visibleReactions.length === 0 ? (
                  <div className="reading-room-timeline-empty">No spoilers yet. React as you read.</div>
                ) : visibleReactions.map((reaction, index) => (
                  <article key={`${reaction.createdAt || index}-${index}`} className="reading-room-timeline-item">
                    <span className="reading-room-timeline-page">Page {reaction.page}</span>
                    <span className="reading-room-timeline-emoji">{reaction.emoji}</span>
                    <div>
                      <strong>{reaction.username}</strong>
                      {reaction.note ? <p>{reaction.note}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="reading-room-notifications">
        {notifications.map((item) => (
          <div key={item.id} className={`reading-room-toast ${item.tone}`}>
            {item.message}
          </div>
        ))}
      </div>

      {celebration && (
        <div className="reading-room-celebration">
          <div className="reading-room-celebration-card">
            <h2>Session complete</h2>
            <p>Everyone finished {celebration.title || session?.title || 'the book'}.</p>
            <div className="reading-room-celebration-list">
              {(celebration.participants || session?.participants || []).map((participant) => (
                <span key={getEntityId(participant.userId)}>{participant.username}</span>
              ))}
            </div>
            <button type="button" className="reading-room-primary-btn" onClick={() => setCelebration(null)}>
              Close
            </button>
          </div>
        </div>
      )}


      {showStartModal && (
        <div className="reading-room-modal-backdrop" onClick={() => setShowStartModal(false)}>
          <div className="reading-room-modal" onClick={(event) => event.stopPropagation()}>
            <div className="reading-room-modal-head">
              <div>
                <span className="reading-room-label">Start a Session</span>
                <h2>Choose a book for the group</h2>
              </div>
              <button type="button" className="reading-room-icon-btn" onClick={() => setShowStartModal(false)}>×</button>
            </div>
            <BookSearch onSelect={setSelectedBook} onClose={() => setShowStartModal(false)} />
            {selectedBook && (
              <div className="reading-room-selected-book">
                <strong>{selectedBook.title}</strong>
                <span>{(selectedBook.authors || []).join(', ') || 'Unknown author'}</span>
              </div>
            )}
            <div className="reading-room-modal-actions">
              <button type="button" className="reading-room-secondary-btn" onClick={() => setShowStartModal(false)}>
                Cancel
              </button>
              <button type="button" className="reading-room-primary-btn" disabled={!selectedBook || starting} onClick={startSession}>
                {starting ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}