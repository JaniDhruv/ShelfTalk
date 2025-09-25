import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Discover.css';

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [info, setInfo] = useState('');
  // Filters
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('any'); // any|public|private
  const [sortBy, setSortBy] = useState('recent'); // recent|name|members

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

  // Only groups where user is a member OR creator
  const myGroups = useMemo(() => {
    const uid = user?._id;
    let list = groups.filter(g => {
      const isMember = (g.members || []).some(m => (m._id || m) === uid);
      const isOwner = (g.createdBy?._id || g.createdBy) === uid;
      return uid && (isMember || isOwner);
    });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(g =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
      );
    }
    if (filterVisibility !== 'any') {
      list = list.filter(g => (g.visibility || 'public') === filterVisibility);
    }
    if (sortBy === 'name') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if (sortBy === 'members') list.sort((a,b) => (b.members?.length||0) - (a.members?.length||0));
    if (sortBy === 'recent') list.sort((a,b) => new Date(b.createdAt||b.updatedAt||0) - new Date(a.createdAt||a.updatedAt||0));
    return list;
  }, [groups, user, search, filterVisibility, sortBy]);

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

  const joinGroup = async (groupId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/add-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to join group');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const leaveGroup = async (groupId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to leave group');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      await fetchGroups();
    } catch (e) { setError(e.message); }
  };

  // Requests actions
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
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 };
  const card = { background: '#fff', border: '2px solid rgba(184, 134, 11, 0.25)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(2, 6, 23, 0.06)' };

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-users" style={{ color: '#B8860B' }}></i>
            Groups
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Discover and join communities. Create your own group.</p>
        </div>
        <button onClick={() => navigate('/posts')} style={{ border: '1px solid #e5e7eb', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-arrow-left" style={{ color: '#722F37' }}></i>
          Back to Posts
        </button>
      </div>
      {error && (
        <div style={{ color: '#8B3A3A', padding: 12, background: '#FDECEC', border: '1px solid rgba(139, 58, 58, 0.30)', borderRadius: 8, marginBottom: 16 }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
          {error}
        </div>
      )}

      {user && (
        <form onSubmit={createGroup} style={{ ...card, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: 6, borderRadius: 10, background: 'linear-gradient(90deg, #8B3A3A, #B8860B, #87A96B)', margin: '-16px -16px 12px -16px' }} />
          <h3 style={{ marginTop: 0, marginBottom: 12, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-users" style={{ color: '#B8860B' }}></i>
            Create a Group
          </h3>
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
      )}

      {/* Filters for my/owned groups - match Discover styles */}
      <div className="sm-filter-card" style={{ marginBottom: 16 }}>
        <div className="sm-filter-header">
          <h6 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <i className="fas fa-filter"></i>
            Filter My Groups
          </h6>
        </div>
        <div className="sm-filter-body">
          <div className="sm-filter-row">
            <div className="sm-search-group">
              <i className="fas fa-search"></i>
              <input
                className="sm-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or description"
              />
              <button type="button" className="sm-search-btn">
                Search
              </button>
            </div>
            <select className="sm-select" value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)}>
              <option value="any">Visibility: Any</option>
              <option value="public">Visibility: Public</option>
              <option value="private">Visibility: Private</option>
            </select>
            <select className="sm-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recent">Sort: Recent</option>
              <option value="name">Sort: Name</option>
              <option value="members">Sort: Members</option>
            </select>
          </div>
        </div>
      </div>

      {user && (
        <div className="sm-requests-container">
          <h3 className="sm-requests-header">
            <i className="fas fa-envelope"></i>
            Requests
          </h3>
          {info && (
            <div className="sm-requests-info">
              <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
              {info}
            </div>
          )}

          <div className="sm-requests-grid">
            <div className="sm-request-card">
              <div className="sm-request-card-title">Invites to me</div>
              {groups.filter(g => (g.invites || []).some(inv => (inv.to?._id || inv.to) === user._id)).length === 0 ? (
                <div className="sm-request-empty">No invites.</div>
              ) : (
                groups.map(g => (
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

            <div className="sm-request-card">
              <div className="sm-request-card-title">My join requests (pending)</div>
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

          <div className="sm-requests-grid">
            <div className="sm-request-card approval">
              <div className="sm-request-card-title">Requests waiting for my approval</div>
              {groups.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).length === 0 ? (
                <div className="sm-request-empty">No requests to review.</div>
              ) : (
                groups.filter(g => (g.createdBy?._id || g.createdBy) === user._id && (g.joinRequests || []).length > 0).map(g => (
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

            <div className="sm-request-card membership">
              <div className="sm-request-card-title">My memberships</div>
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
      )}

      <div className="sm-group-cards-grid">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="sm-group-card-loading">
              <div className="sm-loading-title"></div>
              <div className="sm-loading-description"></div>
              <div className="sm-loading-actions">
                <div className="sm-loading-btn"></div>
                <div className="sm-loading-btn" style={{ width: 110 }}></div>
              </div>
            </div>
          ))
        ) : myGroups.length === 0 ? (
          <div className="sm-groups-empty">No groups yet.</div>
        ) : (
          myGroups.map(g => {
            const isMember = user && user._id && g.members?.some(m => (m._id || m) === user._id);
            const canDelete = user && user._id && ((g.createdBy?._id || g.createdBy) === user._id);
            return (
              <div key={g._id} className="sm-group-card">
                <div className="sm-group-card-header">
                  <div className="sm-group-card-info">
                    <div className="sm-group-card-title-row">
                      <div className="sm-group-avatar">{(g.name?.[0] || '?').toUpperCase()}</div>
                      <h4 className="sm-group-card-name">{g.name}</h4>
                    </div>
                    <div className="sm-group-card-description">{g.description || 'No description provided.'}</div>
                    <span className={`sm-group-visibility-badge ${g.visibility === 'private' ? 'private' : 'public'}`}>
                      {g.visibility === 'private' ? 'Private' : 'Public'}
                    </span>
                    <div className="sm-group-members-count">{g.members?.length || 0} members</div>
                  </div>
                  {canDelete && (
                    <button onClick={() => deleteGroup(g._id)} title="Delete group" className="sm-group-delete-btn">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </div>
                <div className="sm-group-actions">
                  {!isMember ? (
                    <button onClick={() => joinGroup(g._id)} className="sm-group-btn sm-group-btn-join">
                      {g.visibility === 'private' ? 'Request to Join' : 'Join'}
                    </button>
                  ) : (
                    <button onClick={() => leaveGroup(g._id)} className="sm-group-btn sm-group-btn-leave">Leave</button>
                  )}
                  <Link to={`/groups/${g._id}`} className="sm-group-btn sm-group-btn-view">View</Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



