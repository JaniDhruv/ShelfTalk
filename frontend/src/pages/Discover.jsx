import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import './Discover.css';

const buildPresence = (user) => {
  const profile = user?.profile;
  if (!profile) {
    return { isOnline: false, lastSeen: null };
  }
  const lastSeenDate = profile.lastSeen ? new Date(profile.lastSeen) : null;
  const validLastSeen = lastSeenDate && !Number.isNaN(lastSeenDate.getTime()) ? lastSeenDate : null;
  const isOnlineFlag = profile.isOnline === true || profile.isOnline === 'true' || profile.isOnline === 1;
  return {
    isOnline: isOnlineFlag,
    lastSeen: validLastSeen,
  };
};

const humanizeLastSeen = (date) => {
  if (!date) return null;
  const reference = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(reference.getTime())) return null;
  const diffMs = Date.now() - reference.getTime();
  if (diffMs < 0) return null;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return reference.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatPresenceLabel = (presence) => {
  if (!presence) return 'Offline';
  if (presence.isOnline) return 'Online';
  const humanized = humanizeLastSeen(presence.lastSeen);
  return humanized ? `Last seen ${humanized}` : 'Offline';
};

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [languagesFilter, setLanguagesFilter] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [bookClubs, setBookClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState('');
  const [clubsInfo, setClubsInfo] = useState('');
  // Clubs filter state
  const [clubSearch, setClubSearch] = useState('');
  const [clubFilterVisibility, setClubFilterVisibility] = useState('any'); // any|public|private
  const [clubOwnership, setClubOwnership] = useState('any'); // any|mine|joined|not_joined
  const [clubSort, setClubSort] = useState('recent'); // recent|name|members
  const isGuest = !user;
  const [guestPrompt, setGuestPrompt] = useState('');

  const genres = [
    'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
    'Literary Fiction', 'Contemporary Fiction', 'Historical Fiction',
    'Young Adult', 'Biography', 'Self-Help', 'Non-Fiction', 'Horror',
    'Adventure', 'Philosophy', 'Poetry', 'Drama', 'Comedy', 'Travel'
  ];

  useEffect(() => {
    if (!guestPrompt) return;
    const timer = setTimeout(() => setGuestPrompt(''), 3500);
    return () => clearTimeout(timer);
  }, [guestPrompt]);

  const requireAuth = (message = 'Please sign in to continue.') => {
    setGuestPrompt(message);
  };

  // Sync active tab with ?tab= query parameter
  useEffect(() => {
    const tab = (searchParams.get('tab') || '').toLowerCase();
    if (tab === 'users' || tab === 'clubs') {
      setActiveTab(tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When switching tabs via UI, update the query param for deep-linking
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (locationFilter) params.append('location', locationFilter);
    if (selectedGenres.length) params.append('genres', selectedGenres.join(','));
    if (selectedAuthors) params.append('authors', selectedAuthors);
    if (languagesFilter) params.append('languages', languagesFilter);
    if (sortBy) params.append('sortBy', sortBy);
    try {
      console.log('Fetching users with params:', params.toString());
      setIsLoading(true);
      const resp = await fetch(`http://localhost:5000/api/discover/users?${params.toString()}`);
      const data = await resp.json();
      console.log('Received users:', data?.length || 0, data);
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, locationFilter, selectedGenres, selectedAuthors, languagesFilter, sortBy]);

  const fetchClubs = async () => {
    try {
      setClubsLoading(true);
      setClubsError('');
      const resp = await fetch('http://localhost:5000/api/groups');
      if (!resp.ok) throw new Error('Failed to load groups');
      const data = await resp.json();
      setBookClubs(data || []);
    } catch (e) {
      console.error('Failed to load groups', e);
      setClubsError(e.message || 'Failed to load groups');
    } finally {
      setClubsLoading(false);
    }
  };

  const joinGroup = async (groupId) => {
    if (!user || !user._id) { setClubsError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/add-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to join group');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  const leaveGroup = async (groupId) => {
    if (!user || !user._id) { setClubsError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to leave group');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  const respondInvite = async (groupId, accept) => {
    if (!user || !user._id) { setClubsError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/invite/respond`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: user._id, accept })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to respond');
      setClubsInfo(data.message || 'Handled');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  const approveJoin = async (groupId, requesterId) => {
    if (!user || !user._id) { setClubsError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, actorId: user._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve');
      setClubsInfo('Request approved');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  const declineJoin = async (groupId, requesterId) => {
    if (!user || !user._id) { setClubsError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, actorId: user._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to decline');
      setClubsInfo('Request declined');
      await fetchClubs();
    } catch (e) { setClubsError(e.message); }
  };

  // Load all users by default when component mounts and when switching to users tab
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'clubs') fetchClubs();
  }, [activeTab]);

  // Users list without the logged-in user
  const visibleUsers = React.useMemo(() => {
    const uid = user?._id || user?.id;
    const filtered = (users || []).filter(u => (u._id || u.id) !== uid);
    if (!onlineOnly) return filtered;
    return filtered.filter(candidate => buildPresence(candidate).isOnline);
  }, [users, user, onlineOnly]);

  // Derived filtered/sorted clubs
  const filteredClubs = React.useMemo(() => {
    let list = [...bookClubs];
    if (clubSearch.trim()) {
      const q = clubSearch.trim().toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.createdBy?.username || '').toLowerCase().includes(q)
      );
    }
    if (clubFilterVisibility !== 'any') {
      list = list.filter(c => (c.visibility || 'public') === clubFilterVisibility);
    }
    if (user && user._id && clubOwnership !== 'any') {
      const isMember = (c) => (c.members || []).some(m => (m._id || m) === user._id);
      const isOwner = (c) => (c.createdBy?._id || c.createdBy) === user._id;
      if (clubOwnership === 'mine') list = list.filter(isOwner);
      if (clubOwnership === 'joined') list = list.filter(isMember);
      if (clubOwnership === 'not_joined') list = list.filter(c => !isMember(c) && !isOwner(c));
    }
    if (clubSort === 'name') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if (clubSort === 'members') list.sort((a,b) => (b.members?.length||0) - (a.members?.length||0));
    if (clubSort === 'recent') list.sort((a,b) => new Date(b.createdAt||b.updatedAt||0) - new Date(a.createdAt||a.updatedAt||0));
    return list;
  }, [bookClubs, clubSearch, clubFilterVisibility, clubOwnership, clubSort, user]);

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };


  const handleMessage = async (userId) => {
    try {
      const uid = user?._id || user?.id;
      const response = await fetch('http://localhost:5000/api/chat/conversations/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [uid, userId] }),
      });
      if (response.ok) {
        const newChat = await response.json();
        navigate(`/chat?conversation=${newChat._id}`);
      } else {
        console.error('Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  return (
    <div className="discover-container">
      {/* StudyMATE-like Header Section */}
      <div className="sm-header-section">
        <div className="sm-header-content">
          <div className="sm-header-text">
            <h2 className="sm-title"><i className="fas fa-users"></i> Find Your Reading Partner</h2>
            <p className="sm-subtitle">Connect with readers to enhance your literary journey</p>
          </div>
          <button
            type="button"
            className={`sm-invite-btn ${isGuest ? 'guest-locked' : ''}`}
            onClick={() => {
              if (isGuest) {
                requireAuth('Sign in to invite friends to ShelfTalk.');
              }
            }}
          >
            <i className="fas fa-user-plus"></i> Invite Friends
          </button>
        </div>
      </div>

      {/* StudyMATE-like Tabs */}
      <div className="discover-navigation">
        <div className="nav-container">
          <button
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <i className="fas fa-users"></i>
            Readers
          </button>
          <button
            className={`nav-tab ${activeTab === 'clubs' ? 'active' : ''}`}
            onClick={() => handleTabChange('clubs')}
          >
            <i className="fas fa-book-open"></i>
            Book Clubs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="discover-content">
        {isGuest && (
          <div className="guest-readonly-banner">
            <div className="guest-readonly-message">
              <i className="fas fa-door-open" aria-hidden="true"></i>
              <div>
                <h3>Browsing as a guest</h3>
                <p>Create a free account to message readers and join clubs.</p>
              </div>
            </div>
            <div className="guest-readonly-actions">
              <Link to="/login" className="btn btn-primary">Log In</Link>
              <Link to="/signup" className="btn btn-secondary guest-signup-btn">Sign Up</Link>
            </div>
          </div>
        )}

        {guestPrompt && (
          <div className="guest-prompt">
            <i className="fas fa-lock" aria-hidden="true"></i>
            <span>{guestPrompt}</span>
            <div className="guest-readonly-actions" style={{ marginLeft: 'auto' }}>
              <Link to="/login" className="btn btn-primary btn-sm">Log In</Link>
              <Link to="/signup" className="btn btn-secondary guest-signup-btn btn-sm">Sign Up</Link>
            </div>
            <button
              type="button"
              className="guest-prompt-dismiss"
              onClick={() => setGuestPrompt('')}
              aria-label="Dismiss guest prompt"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            {/* StudyMATE-like Filter Card */}
            <div className="sm-filter-card">
              <div className="sm-filter-header">
                <h6><i className="fas fa-filter"></i> Filter Users</h6>
              </div>
              <div className="sm-filter-body">
                <div className="sm-filter-row">
                  <div className="sm-search-group">
                    <i className="fas fa-search"></i>
                    <input
                      type="text"
                      className="sm-search-input"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="sm-search-btn" onClick={fetchUsers}>Search</button>
                  </div>
                  <select className="sm-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="username">Sort: Username</option>
                    <option value="recent">Sort: Recently Joined</option>
                    <option value="online">Sort: Online</option>
                  </select>
                  <input
                    type="text"
                    className="sm-input"
                    placeholder="Location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                  <div className="sm-toggle-group">
                    <button
                      type="button"
                      className={`sm-toggle ${onlineOnly ? 'active' : ''}`}
                      onClick={() => setOnlineOnly(prev => !prev)}
                      aria-pressed={onlineOnly}
                    >
                      <i className="fas fa-signal"></i>
                      Online now
                    </button>
                  </div>
                  <button className="sm-apply-btn" onClick={fetchUsers}>Apply</button>
                </div>
                <div className="sm-adv-row">
                  <input
                    type="text"
                    className="sm-input"
                    placeholder="Favorite authors"
                    value={selectedAuthors}
                    onChange={(e) => setSelectedAuthors(e.target.value)}
                  />
                  <input
                    type="text"
                    className="sm-input"
                    placeholder="Languages"
                    value={languagesFilter}
                    onChange={(e) => setLanguagesFilter(e.target.value)}
                  />
                </div>
                <div className="genre-filters">
                  <h4>Favorite Genres</h4>
                  <div className="genre-tags">
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        className={`genre-tag ${selectedGenres.includes(genre) ? 'active' : ''}`}
                        onClick={() => handleGenreToggle(genre)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Users Grid */}
            {isLoading ? (
              <div className="sm-empty">
                <div className="sm-empty-icon"><i className="fas fa-spinner fa-spin"></i></div>
                <p>Loading users…</p>
              </div>
            ) : (
              <div className="users-grid">
                {visibleUsers.length === 0 && (
                  <div className="sm-empty">
                    <div className="sm-empty-icon"><i className="fas fa-users"></i></div>
                    <h5>No users found</h5>
                    <p>Try adjusting your search or filters</p>
                    <button className="sm-apply-btn" onClick={() => { setSearchQuery(''); setLocationFilter(''); setSelectedGenres([]); setSelectedAuthors(''); setLanguagesFilter(''); setSortBy('username'); setOnlineOnly(false); fetchUsers(); }}>
                      <i className="fas fa-sync-alt"></i> Reset Filters
                    </button>
                  </div>
                )}
                {visibleUsers.map((u) => {
                  const displayName = u.username || 'Reader';
                  const initials = (u.profile?.fullName?.[0] || u.username?.[0] || 'R').toUpperCase();
                  const location = u.profile?.location;
                  const bio = u.profile?.bio;
                  const favoriteGenres = u.profile?.favoriteGenres || [];
                  const presence = buildPresence(u);
                  const statusLabel = formatPresenceLabel(presence);
                  return (
                    <div key={u._id} className="sm-user-card">
                      <div className="sm-card-top" />
                      <div className="sm-card-body">
                        <div className="sm-card-accent" />
                          <div className="sm-card-header">
                            <div className="sm-avatar-wrap">
                              <div className="sm-avatar">{initials}</div>
                              <div className={`sm-status ${presence.isOnline ? 'active' : 'inactive'}`} />
                            </div>
                            <div className="sm-header-meta">
                              <span className="sm-role-badge"><i className="fas fa-user"></i> {u.username || displayName}</span>
                              <span className={`presence-pill ${presence.isOnline ? 'online' : 'offline'}`} title={presence.isOnline ? 'User is online' : (presence.lastSeen ? `Last seen ${presence.lastSeen.toLocaleString()}` : 'User is offline')}>
                                <span className={`status-dot ${presence.isOnline ? 'online' : 'offline'}`} />
                                {statusLabel}
                              </span>
                            </div>
                        </div>
                        {(u.profile?.fullName || location) && (
                          <div className="sm-details">
                            {u.profile?.fullName && (
                              <div className="sm-detail"><i className="fas fa-user"></i><small>{u.profile.fullName}</small></div>
                            )}
                            {location && (
                              <div className="sm-detail"><i className="fas fa-map-marker-alt"></i><small>{location}</small></div>
                            )}
                          </div>
                        )}
                        {bio && (
                          <div className="sm-bio">
                            <p className="sm-bio-text">{bio}</p>
                          </div>
                        )}
                        {favoriteGenres.length > 0 && (
                          <div className="sm-skills">
                            <div className="sm-section-head"><i className="fas fa-brain"></i><small>Favorite genres</small></div>
                            <div className="sm-skills-list">
                              {favoriteGenres.slice(0, 3).map((g, idx) => (
                                <span key={idx} className="sm-badge-item">{typeof g === 'string' ? g : g.name}</span>
                              ))}
                              {favoriteGenres.length > 3 && (
                                <small className="sm-more">+{favoriteGenres.length - 3} more</small>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="sm-card-footer">
                        <div className="sm-actions">
                          <button className="sm-btn outline" onClick={() => window.open(`/profile/${u._id}`, '_blank')}><i className="fas fa-user"></i> View Profile</button>
                          <button
                            className={`sm-btn ghost ${isGuest ? 'guest-locked' : ''}`}
                            onClick={() => {
                              if (isGuest) {
                                requireAuth('Sign in to start a conversation.');
                                return;
                              }
                              handleMessage(u._id);
                            }}
                          >
                            <i className="fas fa-envelope"></i> Message
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clubs' && (
          <div className="clubs-section">
            {/* Replicated Groups functionality for Book Clubs */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, width: '100%' }}>
              {/* Clubs Filters */}
              <div className="sm-filter-card" style={{ marginBottom: 16 }}>
                <div className="sm-filter-header">
                  <h6><i className="fas fa-filter"></i> Filter Book Clubs</h6>
                </div>
                <div className="sm-filter-body">
                  <div className="sm-filter-row">
                    <div className="sm-search-group">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        className="sm-search-input"
                        placeholder="Search clubs by name, description, creator..."
                        value={clubSearch}
                        onChange={(e) => setClubSearch(e.target.value)}
                      />
                      <button className="sm-search-btn" onClick={fetchClubs}>Search</button>
                    </div>
                    <select className="sm-select" value={clubFilterVisibility} onChange={(e) => setClubFilterVisibility(e.target.value)}>
                      <option value="any">Visibility: Any</option>
                      <option value="public">Visibility: Public</option>
                      <option value="private">Visibility: Private</option>
                    </select>
                    <select className="sm-select" value={clubOwnership} onChange={(e) => setClubOwnership(e.target.value)}>
                      <option value="any">Ownership: Any</option>
                      <option value="mine">Ownership: Created by me</option>
                      <option value="joined">Membership: I joined</option>
                      <option value="not_joined">Membership: Not joined</option>
                    </select>
                    <select className="sm-select" value={clubSort} onChange={(e) => setClubSort(e.target.value)}>
                      <option value="recent">Sort: Recent</option>
                      <option value="name">Sort: Name</option>
                      <option value="members">Sort: Members</option>
                    </select>
                    <button className="sm-apply-btn" onClick={() => { /* No-op, filters are reactive */ }}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {clubsError && (
                <div style={{ color: '#dc2626', padding: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16 }}>❌ {clubsError}</div>
              )}

              {/* Create form intentionally removed in Book Clubs section */}

              {user && (
                <div className="sm-requests-container">
                  <h3 className="sm-requests-header">
                    <i className="fas fa-envelope"></i>
                    Requests
                  </h3>
                  {clubsInfo && <div className="sm-requests-info">ℹ️ {clubsInfo}</div>}
                  <div className="sm-requests-grid">
                    <div className="sm-request-card">
                      <div className="sm-request-card-title">Invites to me</div>
                      <div className="sm-scroll-requests">
                        {bookClubs.filter(g => (g.invites || []).some(inv => (inv.to?._id || inv.to) === user._id)).length === 0 ? (
                          <div className="sm-request-empty">No invites.</div>
                        ) : (
                          bookClubs.map(g => (
                            (g.invites || []).filter(inv => (inv.to?._id || inv.to) === user._id).map(inv => (
                              <div key={g._id + '-' + (inv.to?._id || inv.to)} className="sm-request-item">
                                <div className="sm-request-item-content">
                                  <div className="sm-request-item-name">{g.name}</div>
                                  <div className="sm-request-item-meta">From: {inv.from?.username || inv.from}</div>
                                </div>
                                <button onClick={() => respondInvite(g._id, true)} className="sm-request-btn sm-request-btn-accept">Accept</button>
                                <button onClick={() => respondInvite(g._id, false)} className="sm-request-btn sm-request-btn-decline">Decline</button>
                              </div>
                            ))
                          ))
                        )}
                      </div>
                    </div>
                    <div className="sm-request-card">
                      <div className="sm-request-card-title">My join requests (pending)</div>
                      <div className="sm-scroll-requests">
                        {bookClubs.filter(g => (g.joinRequests || []).some(r => (r._id || r) === user._id)).length === 0 ? (
                          <div className="sm-request-empty">No pending join requests.</div>
                        ) : (
                          bookClubs.filter(g => (g.joinRequests || []).some(r => (r._id || r) === user._id)).map(g => (
                            <div key={g._id} className="sm-request-item">
                              <div className="sm-request-item-content">
                                <div className="sm-request-item-name">{g.name}</div>
                                <div className="sm-request-item-meta">Waiting for approval</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm-requests-grid">
                    <div className="sm-request-card approval">
                      <div className="sm-request-card-title">Requests waiting for my approval</div>
                      <div className="sm-scroll-requests">
                        {bookClubs.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).length === 0 ? (
                          <div className="sm-request-empty">No requests to review.</div>
                        ) : (
                          bookClubs.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).map(g => (
                            (g.joinRequests || []).map(r => (
                              <div key={g._id + '-' + (r._id || r)} className="sm-request-item">
                                <div className="sm-request-item-content">
                                  <div className="sm-request-item-name">{g.name}</div>
                                  <div className="sm-request-item-meta">{r.username || r} wants to join</div>
                                </div>
                                <button onClick={() => approveJoin(g._id, r._id || r)} className="sm-request-btn sm-request-btn-accept">Approve</button>
                                <button onClick={() => declineJoin(g._id, r._id || r)} className="sm-request-btn sm-request-btn-decline">Decline</button>
                              </div>
                            ))
                          ))
                        )}
                      </div>
                    </div>
                    <div className="sm-request-card membership">
                      <div className="sm-request-card-title">My memberships</div>
                      <div className="sm-scroll-requests">
                        {bookClubs.filter(g => (g.members || []).some(m => (m._id || m) === user._id)).length === 0 ? (
                          <div className="sm-request-empty">Not a member of any group.</div>
                        ) : (
                          bookClubs.filter(g => (g.members || []).some(m => (m._id || m) === user._id)).map(g => (
                            <div key={g._id} className="sm-request-item">
                              <div className="sm-request-item-content">
                                <div className="sm-request-item-name">{g.name}</div>
                                <div className="sm-request-item-meta">Member</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="sm-group-cards-grid">
                {clubsLoading ? (
                  [1,2,3,4].map(i => (
                    <div key={i} className="sm-group-card-loading">
                      <div className="sm-loading-title" />
                      <div className="sm-loading-description" />
                      <div className="sm-loading-actions">
                        <div className="sm-loading-btn" />
                        <div className="sm-loading-btn" />
                      </div>
                    </div>
                  ))
                ) : filteredClubs.length === 0 ? (
                  <div className="sm-groups-empty">No groups yet.</div>
                ) : (
                  filteredClubs.map(g => {
                    const isMember = user && user._id && g.members?.some(m => (m._id || m) === user._id);
                    const canDelete = user && user._id && ((g.createdBy?._id || g.createdBy) === user._id);
                    return (
                      <div key={g._id} className="sm-group-card">
                        <div className="sm-group-card-header">
                          <div className="sm-group-card-info">
                            <div className="sm-group-card-title-row">
                              <div className="sm-group-avatar">
                                {(g.name?.[0] || '?').toUpperCase()}
                              </div>
                              <h4 className="sm-group-card-name">{g.name}</h4>
                            </div>
                            <div className="sm-group-card-description">{g.description || 'No description provided.'}</div>
                            <div>
                              <span className={`sm-group-visibility-badge ${g.visibility === 'private' ? 'private' : 'public'}`}>
                                {g.visibility === 'private' ? 'Private' : 'Public'}
                              </span>
                            </div>
                            <div className="sm-group-members-count">{g.members?.length || 0} members</div>
                          </div>
                          {canDelete && (
                            <button onClick={() => deleteGroup(g._id)} title="Delete group" className="sm-group-delete-btn">🗑️</button>
                          )}
                        </div>
                        <div className="sm-group-actions">
                          {!isMember ? (
                            <button
                              onClick={() => {
                                if (isGuest) {
                                  requireAuth('Sign in to join or request access to clubs.');
                                  return;
                                }
                                joinGroup(g._id);
                              }}
                              className={`sm-group-btn sm-group-btn-join ${isGuest ? 'guest-locked' : ''}`}
                            >
                              {g.visibility === 'private' ? 'Request to Join' : 'Join'}
                            </button>
                          ) : (
                            <button onClick={() => leaveGroup(g._id)} className="sm-group-btn sm-group-btn-leave">Leave</button>
                          )}
                          <Link to={`/groups/${g._id}`} style={{ textDecoration: 'none' }}>
                            <button className="sm-group-btn sm-group-btn-view">View</button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}