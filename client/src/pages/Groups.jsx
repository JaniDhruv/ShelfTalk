import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [info, setInfo] = useState('');
  // Owner leave/delete modals state
  const [showOwnerLeaveModal, setShowOwnerLeaveModal] = useState(false);
  const [leaveTargetGroup, setLeaveTargetGroup] = useState(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [leavingOwner, setLeavingOwner] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetGroup, setDeleteTargetGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  // Single active section: 'create' | 'requests' | 'my-groups'
  const [activeSection, setActiveSection] = useState(user ? 'my-groups' : 'create');

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/groups');
      if (!res.ok) throw new Error('Failed to load groups');
      const data = await res.json();
      setGroups(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Derived: Owned & Joined (excluding owned) for clearer subsections
  const ownedGroups = useMemo(() => {
    const uid = user?._id;
    return groups.filter(g => {
      if (!uid) return false;
      const ownerMatch = (g.createdBy?._id || g.createdBy) === uid;
      // Also require membership so if ownership was transferred and user removed, it disappears immediately
      const stillMember = (g.members || []).some(m => (m._id || m) === uid);
      return ownerMatch && stillMember;
    });
  }, [groups, user]);

  const joinedGroups = useMemo(() => {
    const uid = user?._id;
    return groups.filter(g => (g.members || []).some(m => (m._id || m) === uid) && (g.createdBy?._id || g.createdBy) !== uid);
  }, [groups, user]);

  const myGroups = useMemo(() => [...ownedGroups, ...joinedGroups]
    .sort((a,b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
  , [ownedGroups, joinedGroups]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), createdBy: user._id, visibility })
      });
      if (!res.ok) throw new Error('Failed to create group');
      setName(''); setDescription('');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  // Removed unused joinGroup (was triggering ESLint no-unused-vars)

  const leaveGroup = async (groupId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/remove-member`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to leave group');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const leaveAsOwner = async () => {
    if (!leaveTargetGroup || !user?._id) return;
    setLeavingOwner(true);
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${leaveTargetGroup._id}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, newOwnerId: selectedNewOwner || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setInfo(data.message || 'Unable to transfer ownership');
        return;
      }
      setInfo(data.message || 'Ownership transferred & left');
      setShowOwnerLeaveModal(false);
      setLeaveTargetGroup(null);
      setSelectedNewOwner('');
      await fetchGroups();
    } catch (e) {
      setError('Error leaving as owner');
    } finally {
      setLeavingOwner(false);
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      setDeletingGroup(true);
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      setShowDeleteModal(false);
      setDeleteTargetGroup(null);
      await fetchGroups();
    } catch (e) { setError(e.message); } finally { setDeletingGroup(false); }
  };

  const respondInvite = async (groupId, accept) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/invite/respond`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: user._id, accept })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to respond');
      setInfo(data.message || 'Handled');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const approveJoin = async (groupId, requesterId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, actorId: user._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve');
      setInfo('Request approved');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const declineJoin = async (groupId, requesterId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId, actorId: user._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to decline');
      setInfo('Request declined');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const container = { maxWidth: 1100, margin: '0 auto', padding: 24 };
  const card = { background: '#fff', border: '2px solid rgba(184, 134, 11, 0.25)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(2, 6, 23, 0.06)' };

  // Badge helpers
  const requestTotals = useMemo(() => {
    if (!user?._id) return { invites:0, myPending:0, approvals:0, total:0 };
    const invites = groups.reduce((acc,g)=> acc + (g.invites||[]).filter(inv => (inv.to?._id||inv.to)===user._id).length,0);
    const myPending = groups.filter(g => (g.joinRequests||[]).some(r => (r._id||r)===user._id)).length;
    const approvals = groups.filter(g => (g.createdBy?._id||g.createdBy)===user._id && (g.joinRequests||[]).length>0).length;
    return { invites, myPending, approvals, total: invites + myPending + approvals };
  }, [groups, user]);

  return (
    <div>
      {/* Hero header */}
      <div className="sm-header-section" style={{ marginBottom: 0 }}>
        <div className="sm-header-content" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="sm-header-text">
            <h2 className="sm-title"><i className="fas fa-layer-group"></i> Your Book Groups</h2>
            <p className="sm-subtitle">Create communities, manage requests, and explore your groups</p>
          </div>
        </div>
      </div>

      {/* Sticky navigation (Discover style) */}
      <div className="discover-navigation" style={{ position: 'sticky', top: '76px', zIndex: 100 }}>
        <div className="nav-container">
          {user && (
            <button onClick={() => setActiveSection('create')} className={`nav-tab ${activeSection === 'create' ? 'active' : ''}`}>
              <i className="fas fa-plus-circle"></i>
              <span>Create</span>
            </button>
          )}
          {user && (
            <button onClick={() => setActiveSection('requests')} className={`nav-tab ${activeSection === 'requests' ? 'active' : ''}`}>
              <i className="fas fa-envelope"></i>
              <span>Requests{requestTotals.total ? <span className="sm-badge">{requestTotals.total}</span> : null}</span>
            </button>
          )}
          <button onClick={() => setActiveSection('my-groups')} className={`nav-tab ${activeSection === 'my-groups' ? 'active' : ''}`}>
            <i className="fas fa-users"></i>
            <span>My Groups{myGroups.length ? <span className="sm-badge">{myGroups.length}</span> : null}</span>
          </button>
        </div>
      </div>

      <div style={container} className="discover-content">
        {error && (
          <div style={{ color: '#8B3A3A', padding: 12, background: '#FDECEC', border: '1px solid rgba(139, 58, 58, 0.30)', borderRadius: 8, marginBottom: 16 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
            {error}
          </div>
        )}

        {/* CREATE SECTION (exclusive) */}
        {user && activeSection === 'create' && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ ...card }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#111827' }}>
                <i className="fas fa-plus-circle" style={{ color: '#B8860B' }}></i>
                Create Group
              </h3>
              <form onSubmit={createGroup} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <button type="submit" disabled={!name.trim()} style={{ background: !name.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #722F37, #B8860B)', color: '#FFFEF7', border: 'none', borderRadius: 9999, padding: '10px 14px', cursor: !name.trim() ? 'not-allowed' : 'pointer', fontWeight: 700 }}>Create</button>
                </div>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </form>
            </div>
          </section>
        )}

        {/* REQUESTS SECTION (exclusive) */}
        {user && activeSection === 'requests' && (
          <section style={{ marginBottom: 48 }}>
            <h3 className="sm-requests-header" style={{ marginTop: 0 }}>
              <i className="fas fa-envelope"></i>
              Requests
            </h3>
            {info && (
              <div className="sm-requests-info">
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                {info}
              </div>
            )}
            {/* Requests Grid 1 */}
            <div className="sm-requests-grid">
              <div className="sm-request-card">
                <div className="sm-request-card-title">Invites to me</div>
                <div className="sm-scroll-requests">
                  {groups.filter(g => (g.invites || []).some(inv => (inv.to?._id || inv.to) === user._id)).length === 0 ? (
                    <div className="sm-request-empty">No invites.</div>
                  ) : (
                    groups.map(g => (
                      (g.invites || []).filter(inv => (inv.to?._id || inv.to) === user._id).map(inv => {
                        const inviterPresence = buildPresence(inv.from);
                        const inviterLabel = formatPresenceLabel(inviterPresence);
                        return (
                        <div key={g._id + '-' + (inv.to?._id || inv.to)} className="sm-request-item">
                          <div className="sm-request-item-content">
                            <div className="sm-request-item-name">{g.name}</div>
                            <div className="sm-request-item-meta" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span>From: {inv.from?.username || inv.from}</span>
                              <span
                                className={`presence-pill ${inviterPresence.isOnline ? 'online' : 'offline'}`}
                                title={inviterPresence.isOnline ? 'User is online' : (inviterPresence.lastSeen ? `Last seen ${inviterPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                              >
                                <span className={`status-dot ${inviterPresence.isOnline ? 'online' : 'offline'}`}></span>
                                {inviterLabel}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => respondInvite(g._id, true)} className="sm-request-btn sm-request-btn-accept">Accept</button>
                          <button onClick={() => respondInvite(g._id, false)} className="sm-request-btn sm-request-btn-decline">Decline</button>
                        </div>
                      );
                      })
                    ))
                  )}
                </div>
              </div>

              <div className="sm-request-card">
                <div className="sm-request-card-title">My join requests (pending)</div>
                <div className="sm-scroll-requests">
                  {groups.filter(g => (g.joinRequests || []).some(r => (r._id || r) === user._id)).length === 0 ? (
                    <div className="sm-request-empty">No pending join requests.</div>
                  ) : (
                    groups.filter(g => (g.joinRequests || []).some(r => (r._id || r) === user._id)).map(g => (
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

            {/* Requests Grid 2 */}
            <div className="sm-requests-grid">
              <div className="sm-request-card approval">
                <div className="sm-request-card-title">Requests waiting for my approval</div>
                <div className="sm-scroll-requests">
                  {groups.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).length === 0 ? (
                    <div className="sm-request-empty">No requests to review.</div>
                  ) : (
                    groups.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).map(g => (
                      (g.joinRequests || []).map(r => {
                        const requesterPresence = buildPresence(r);
                        const requesterLabel = formatPresenceLabel(requesterPresence);
                        return (
                        <div key={g._id + '-' + (r._id || r)} className="sm-request-item">
                          <div className="sm-request-item-content">
                            <div className="sm-request-item-name">{g.name}</div>
                            <div className="sm-request-item-meta" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span>{r.username || r} wants to join</span>
                              <span
                                className={`presence-pill ${requesterPresence.isOnline ? 'online' : 'offline'}`}
                                title={requesterPresence.isOnline ? 'User is online' : (requesterPresence.lastSeen ? `Last seen ${requesterPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                              >
                                <span className={`status-dot ${requesterPresence.isOnline ? 'online' : 'offline'}`}></span>
                                {requesterLabel}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => approveJoin(g._id, r._id || r)} className="sm-request-btn sm-request-btn-accept">Approve</button>
                          <button onClick={() => declineJoin(g._id, r._id || r)} className="sm-request-btn sm-request-btn-decline">Decline</button>
                        </div>
                      );
                      })
                    ))
                  )}
                </div>
              </div>

              <div className="sm-request-card membership">
                <div className="sm-request-card-title">My memberships</div>
                <div className="sm-scroll-requests">
                  {groups.filter(g => (g.members || []).some(m => (m._id || m) === user._id)).length === 0 ? (
                    <div className="sm-request-empty">Not a member of any group.</div>
                  ) : (
                    groups.filter(g => (g.members || []).some(m => (m._id || m) === user._id)).map(g => (
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
          </section>
        )}

        {/* MY GROUPS SECTION (exclusive) */}
        {activeSection === 'my-groups' && (
        <section style={{ marginBottom: 60 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', color: '#111827' }}>
            <i className="fas fa-layer-group" style={{ color: '#B8860B' }}></i>
            My Groups
          </h3>
          {loading ? (
            <div className="sm-group-cards-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="sm-group-card-loading">
                  <div className="sm-loading-title"></div>
                  <div className="sm-loading-description"></div>
                  <div className="sm-loading-actions">
                    <div className="sm-loading-btn"></div>
                    <div className="sm-loading-btn" style={{ width: 110 }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="sm-groups-empty">No groups yet.</div>
          ) : (
            <>
              {/* Owned Subsection */}
              {ownedGroups.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h4 style={{ margin: '0 0 12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-crown" style={{ color: '#B8860B' }}></i>
                    Owned ({ownedGroups.length})
                  </h4>
                  <div className="sm-group-cards-grid">
                    {ownedGroups.map(g => {
                      const canDelete = user && user._id && ((g.createdBy?._id || g.createdBy) === user._id);
                      const isMember = true; // owner is implicitly a member
                      const ownerPresence = buildPresence(g.createdBy);
                      const ownerLabel = formatPresenceLabel(ownerPresence);
                      const ownerName = g.createdBy?.username || user?.username || 'You';
                      return (
                        <div key={g._id} className="sm-group-card">
                          <div className="sm-group-card-header">
                            <div className="sm-group-card-info">
                              <div className="sm-group-card-title-row">
                                <div className="sm-group-avatar">{(g.name?.[0] || '?').toUpperCase()}</div>
                                <h4 className="sm-group-card-name">{g.name}</h4>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  <i className="fas fa-crown" style={{ marginRight: 6, color: '#B8860B' }}></i>
                                  Owner
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{ownerName}</span>
                                  <span
                                    className={`presence-pill ${ownerPresence.isOnline ? 'online' : 'offline'}`}
                                    title={ownerPresence.isOnline ? 'User is online' : (ownerPresence.lastSeen ? `Last seen ${ownerPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                                  >
                                    <span className={`status-dot ${ownerPresence.isOnline ? 'online' : 'offline'}`}></span>
                                    {ownerLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="sm-group-card-description">{g.description || 'No description provided.'}</div>
                              <span className={`sm-group-visibility-badge ${g.visibility === 'private' ? 'private' : 'public'}`}>
                                {g.visibility === 'private' ? 'Private' : 'Public'}
                              </span>
                              <div className="sm-group-members-count">{g.members?.length || 0} members</div>
                            </div>
                            {canDelete && (
                              <button onClick={() => { setDeleteTargetGroup(g); setShowDeleteModal(true); }} title="Delete group" className="sm-group-delete-btn">
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                          <div className="sm-group-actions">
                            {isMember && (
                              <button onClick={() => { setLeaveTargetGroup(g); setSelectedNewOwner(''); setShowOwnerLeaveModal(true); }} className="sm-group-btn sm-group-btn-leave">Leave</button>
                            )}
                            <Link to={`/groups/${g._id}`} className="sm-group-btn sm-group-btn-view">View</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Joined Subsection */}
              {joinedGroups.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-user-friends" style={{ color: '#87A96B' }}></i>
                    Joined ({joinedGroups.length})
                  </h4>
                  <div className="sm-group-cards-grid">
                    {joinedGroups.map(g => {
                      const isMember = true; // by definition in joined list
                      const canDelete = user && user._id && ((g.createdBy?._id || g.createdBy) === user._id);
                      const ownerPresence = buildPresence(g.createdBy);
                      const ownerLabel = formatPresenceLabel(ownerPresence);
                      const ownerName = g.createdBy?.username || 'Owner';
                      return (
                        <div key={g._id} className="sm-group-card">
                          <div className="sm-group-card-header">
                            <div className="sm-group-card-info">
                              <div className="sm-group-card-title-row">
                                <div className="sm-group-avatar">{(g.name?.[0] || '?').toUpperCase()}</div>
                                <h4 className="sm-group-card-name">{g.name}</h4>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  <i className="fas fa-crown" style={{ marginRight: 6, color: '#B8860B' }}></i>
                                  Owner
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{ownerName}</span>
                                  <span
                                    className={`presence-pill ${ownerPresence.isOnline ? 'online' : 'offline'}`}
                                    title={ownerPresence.isOnline ? 'User is online' : (ownerPresence.lastSeen ? `Last seen ${ownerPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                                  >
                                    <span className={`status-dot ${ownerPresence.isOnline ? 'online' : 'offline'}`}></span>
                                    {ownerLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="sm-group-card-description">{g.description || 'No description provided.'}</div>
                              <span className={`sm-group-visibility-badge ${g.visibility === 'private' ? 'private' : 'public'}`}>
                                {g.visibility === 'private' ? 'Private' : 'Public'}
                              </span>
                              <div className="sm-group-members-count">{g.members?.length || 0} members</div>
                            </div>
                            {canDelete && (
                              <button onClick={() => { setDeleteTargetGroup(g); setShowDeleteModal(true); }} title="Delete group" className="sm-group-delete-btn">
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            )}
                          </div>
                          <div className="sm-group-actions">
                            {isMember && (
                              <button onClick={() => leaveGroup(g._id)} className="sm-group-btn sm-group-btn-leave">Leave</button>
                            )}
                            <Link to={`/groups/${g._id}`} className="sm-group-btn sm-group-btn-view">View</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        )}
      </div>
      {/* Owner Leave Modal */}
      {showOwnerLeaveModal && leaveTargetGroup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }} onClick={() => !leavingOwner && setShowOwnerLeaveModal(false)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, boxShadow:'0 10px 30px rgba(0,0,0,0.25)', overflow:'hidden' }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ background:'linear-gradient(135deg,#8B3A3A,#B8860B)', color:'#FFFEF7', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}><i className="fas fa-sign-out-alt" style={{ marginRight:8 }}></i>Leave Group</h3>
              <button onClick={() => !leavingOwner && setShowOwnerLeaveModal(false)} style={{ background:'none', border:'none', color:'#FFFEF7', cursor:'pointer', fontSize:18 }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ padding:20 }}>
              <p style={{ marginTop:0, lineHeight:1.5, color:'#111827' }}>You are the current <strong>owner</strong> of <strong>{leaveTargetGroup.name}</strong>. Select a moderator to transfer ownership before leaving.</p>
              {(!leaveTargetGroup.moderators || leaveTargetGroup.moderators.length === 0) && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', padding:'10px 12px', borderRadius:8, fontSize:13, marginBottom:12 }}>
                  No moderators available. Add a moderator first from the group page.
                </div>
              )}
              {leaveTargetGroup.moderators && leaveTargetGroup.moderators.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#334155', marginBottom:6 }}>Select new owner</label>
                  <select value={selectedNewOwner} onChange={e=>setSelectedNewOwner(e.target.value)} style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14 }}>
                    <option value="">-- Choose moderator --</option>
                    {leaveTargetGroup.moderators.map(m => (
                      <option key={m._id || m} value={m._id || m}>{m.username || m._id || m}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:24 }}>
                <button disabled={leavingOwner} onClick={()=>setShowOwnerLeaveModal(false)} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569', padding:'10px 18px', borderRadius:9999, cursor:leavingOwner?'not-allowed':'pointer', fontSize:14, fontWeight:600 }}>Cancel</button>
                <button disabled={leavingOwner || (!leaveTargetGroup.moderators || leaveTargetGroup.moderators.length===0) || !selectedNewOwner} onClick={leaveAsOwner} style={{ background: (leavingOwner || (!leaveTargetGroup.moderators || leaveTargetGroup.moderators.length===0) || !selectedNewOwner) ? '#e5e7eb' : 'linear-gradient(135deg,#8B3A3A,#B8860B)', border:'none', color:'#FFFEF7', padding:'10px 20px', borderRadius:9999, cursor:(leavingOwner || (!leaveTargetGroup.moderators || leaveTargetGroup.moderators.length===0) || !selectedNewOwner)?'not-allowed':'pointer', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                  {leavingOwner && <i className="fas fa-spinner fa-spin"></i>}
                  {leavingOwner ? 'Leaving...' : 'Transfer & Leave'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Group Modal */}
      {showDeleteModal && deleteTargetGroup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }} onClick={() => !deletingGroup && setShowDeleteModal(false)}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, boxShadow:'0 10px 30px rgba(0,0,0,0.25)', overflow:'hidden' }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ background:'linear-gradient(135deg,#8B3A3A,#B8860B)', color:'#FFFEF7', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}><i className="fas fa-trash" style={{ marginRight:8 }}></i>Delete Group</h3>
              <button onClick={() => !deletingGroup && setShowDeleteModal(false)} style={{ background:'none', border:'none', color:'#FFFEF7', cursor:'pointer', fontSize:18 }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ padding:20 }}>
              <p style={{ marginTop:0, lineHeight:1.5, color:'#111827' }}>Permanently delete <strong>{deleteTargetGroup.name}</strong>? This cannot be undone.</p>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:24 }}>
                <button disabled={deletingGroup} onClick={()=>setShowDeleteModal(false)} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569', padding:'10px 18px', borderRadius:9999, cursor:deletingGroup?'not-allowed':'pointer', fontSize:14, fontWeight:600 }}>Cancel</button>
                <button disabled={deletingGroup} onClick={()=> deleteGroup(deleteTargetGroup._id)} style={{ background: deletingGroup ? '#e5e7eb' : 'linear-gradient(135deg,#8B3A3A,#B8860B)', border:'none', color:'#FFFEF7', padding:'10px 20px', borderRadius:9999, cursor:deletingGroup?'not-allowed':'pointer', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                  {deletingGroup && <i className="fas fa-spinner fa-spin"></i>}
                  {deletingGroup ? 'Deleting...' : 'Delete Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



