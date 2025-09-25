import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    bio: '',
    location: '',
    dateOfBirth: '',
    isPublic: true,
    showReadingGoal: true,
    allowMessagesFrom: 'Everyone',
    timeZone: 'Asia/Kolkata',
    readingGoal: 0,
    favoriteFormat: 'Any',
    readingSpeed: 'Average',
    favoriteAuthors: '',
    languagesSpoken: '',
    favoriteGenres: ''
  });
  const [showAllTimezones, setShowAllTimezones] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userGroups, setUserGroups] = useState([]);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      const resolvedId = userId || user?._id || user?.id;
      if (!resolvedId) return;
      setIsLoading(true);
      try {
        const resp = await fetch(`http://localhost:5000/api/profiles/${resolvedId}`);
        if (!resp.ok) throw new Error('Failed to load profile');
        const data = await resp.json();
        const normalized = {
          id: resolvedId,
          username: user?.username || data?.user?.username || '',
          fullName: data.fullName || user?.username || '',
          email: user?.email,
          bio: data.bio || '',
          avatar: data.avatar || null,
          joinDate: data.joinDate || data.createdAt,
          location: data.location || '',
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || '',
          readingStats: data.readingStats || { totalBooks: 0, reviewsWritten: 0, readingGoal: 0, goalProgress: 0, readingStreak: 0 },
          favoriteGenres: data.favoriteGenres || [],
          currentlyReadingBooks: data.currentlyReadingBooks || [],
          achievements: data.achievements || [],
          socialStats: data.socialStats || { followers: 0, following: 0, bookClubs: 0, discussions: 0 },
        };
        setProfileData(normalized);
        setEditForm({
          fullName: normalized.fullName,
          bio: normalized.bio,
          location: normalized.location,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          showReadingGoal: data.showReadingGoal !== undefined ? data.showReadingGoal : true,
          allowMessagesFrom: data.allowMessagesFrom || 'Everyone',
          timeZone: data.timeZone || 'Asia/Kolkata',
          readingGoal: normalized.readingStats.readingGoal || 0,
          favoriteFormat: normalized.readingStats.favoriteFormat || 'Any',
          readingSpeed: normalized.readingStats.readingSpeed || 'Average',
          favoriteAuthors: (normalized.favoriteAuthors || []).join(', '),
          languagesSpoken: (normalized.languagesSpoken || []).join(', '),
          favoriteGenres: (normalized.favoriteGenres || []).map(g => typeof g === 'string' ? g : g.name).join(', ')
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [userId, user]);

  // Load related data: user's posts and groups
  useEffect(() => {
    const resolvedId = userId || user?._id || user?.id;
    if (!resolvedId) return;

    (async () => {
      try {
        const resp = await fetch('http://localhost:5000/api/posts');
        if (!resp.ok) return;
        const all = await resp.json();
        const mine = (all || [])
          .filter(p => {
            const authorId = p?.author?._id || p?.author;
            return authorId && authorId.toString() === resolvedId.toString();
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setUserPosts(mine);
      } catch {
        // ignore
      }
    })();

    (async () => {
      try {
        const resp = await fetch('http://localhost:5000/api/groups');
        if (!resp.ok) return;
        const groups = await resp.json();
        const mine = (groups || []).filter(g => (g.members || []).some(m => {
          const memberId = m?._id || m;
          return memberId && memberId.toString() === resolvedId.toString();
        }));
        setUserGroups(mine);
      } catch {
        // ignore
      }
    })();
  }, [userId, user]);

  const isOwnProfile = !userId || userId === (user?._id || user?.id);

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const resolvedId = userId || user?._id || user?.id;
    try {
      setIsSaving(true);
      const payload = {
        fullName: editForm.fullName,
        bio: editForm.bio,
        location: editForm.location,
        dateOfBirth: editForm.dateOfBirth ? new Date(editForm.dateOfBirth) : null,
        isPublic: editForm.isPublic,
        showReadingGoal: editForm.showReadingGoal,
        allowMessagesFrom: editForm.allowMessagesFrom,
        timeZone: editForm.timeZone,
        favoriteAuthors: editForm.favoriteAuthors.split(',').map(a => a.trim()).filter(a => a),
        languagesSpoken: editForm.languagesSpoken.split(',').map(l => l.trim()).filter(l => l),
        favoriteGenres: editForm.favoriteGenres.split(',').map(g => ({ name: g.trim() })).filter(g => g.name),
        readingStats: {
          ...(profileData?.readingStats || {}),
          readingGoal: Number(editForm.readingGoal) || 0,
          favoriteFormat: editForm.favoriteFormat,
          readingSpeed: editForm.readingSpeed,
        },
      };
      const resp = await fetch(`http://localhost:5000/api/profiles/${resolvedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('Failed to save');
      const updated = await resp.json();
      setIsEditing(false);
      setProfileData((prev) => ({
        ...prev,
        fullName: updated.fullName,
        bio: updated.bio,
        location: updated.location,
        readingStats: updated.readingStats || prev.readingStats,
      }));
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-loading">
        <p>Profile not found.</p>
      </div>
    );
  }

  const isProfileEmpty = !profileData.bio && !profileData.location &&
    (!profileData.readingStats || profileData.readingStats.readingGoal === 0);

  if (isProfileEmpty && isOwnProfile) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <div className="container">
            <div className="profile-main-info">
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  <div className="avatar-placeholder">
                    <span>{profileData.fullName.charAt(0)}</span>
                  </div>
                </div>
              </div>
              <div className="profile-info">
                <h1 className="profile-name">{profileData.fullName}</h1>
                <p className="profile-username">@{profileData.username}</p>
                <p className="profile-setup-message">Complete your profile to get started!</p>
              </div>
            </div>
          </div>
        </div>
        <div className="profile-body">
          <div className="container profile-content-container">
            <div className="setup-form-card">
              <div className="setup-form-header">
                <h3><i className="fas fa-user-edit"></i> Complete Your Profile</h3>
                <p>Tell us about yourself to connect with other readers</p>
              </div>
              <form onSubmit={handleSaveProfile} className="setup-form">
                <div className="form-row">
                  <label>Full Name</label>
                  <input name="fullName" value={editForm.fullName} onChange={handleEditChange} placeholder="Enter your full name" required />
                </div>
                <div className="form-row">
                  <label>Bio</label>
                  <textarea name="bio" value={editForm.bio} onChange={handleEditChange} rows={4} placeholder="Tell us about yourself, your reading interests, etc." />
                </div>
                <div className="form-grid">
                  <div className="form-row">
                    <label>Location</label>
                    <input name="location" value={editForm.location} onChange={handleEditChange} placeholder="City, Country" />
                  </div>
                  <div className="form-row">
                    <label>Date of Birth</label>
                    <input name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={handleEditChange} />
                  </div>
                  <div className="form-row">
                    <label>Time Zone</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select name="timeZone" value={editForm.timeZone} onChange={handleEditChange} style={{ flex: 1 }}>
                        {(!showAllTimezones ? [
                          { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, India)' },
                          { value: 'Asia/Dhaka', label: 'Asia/Dhaka (Bangladesh)' },
                          { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan)' },
                          { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
                          { value: 'Europe/London', label: 'Europe/London (UK)' },
                          { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
                          { value: 'America/New_York', label: 'America/New_York (ET)' },
                          { value: 'America/Chicago', label: 'America/Chicago (CT)' },
                          { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
                          { value: 'Australia/Sydney', label: 'Australia/Sydney' },
                        ] : (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone').map(z => ({ value: z, label: z })) : [
                          { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, India)' }
                        ])).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <input type="checkbox" checked={showAllTimezones} onChange={e => setShowAllTimezones(e.target.checked)} />
                        Show all timezones
                      </label>
                    </div>
                    <small className="form-help">Default is India Standard Time (Asia/Kolkata)</small>
                  </div>
                  <div className="form-row">
                    <label>Reading Goal for 2025</label>
                    <input name="readingGoal" type="number" value={editForm.readingGoal} onChange={handleEditChange} placeholder="Number of books" min="0" />
                  </div>
                  <div className="form-row">
                    <label>Favorite Reading Format</label>
                    <select name="favoriteFormat" value={editForm.favoriteFormat} onChange={handleEditChange}>
                      <option value="Any">Any</option>
                      <option value="Physical">Physical Books</option>
                      <option value="E-book">E-books</option>
                      <option value="Audiobook">Audiobooks</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Reading Speed</label>
                    <select name="readingSpeed" value={editForm.readingSpeed} onChange={handleEditChange}>
                      <option value="Slow">Slow Reader</option>
                      <option value="Average">Average Reader</option>
                      <option value="Fast">Fast Reader</option>
                    </select>
                  </div>
                </div>
                <div className="form-section">
                  <h4>Reading Preferences</h4>
                  <div className="form-row">
                    <label>Favorite Genres</label>
                    <input name="favoriteGenres" value={editForm.favoriteGenres} onChange={handleEditChange} placeholder="e.g., Fantasy, Science Fiction, Romance" />
                    <small className="form-help">Separate multiple genres with commas</small>
                  </div>
                  <div className="form-row">
                    <label>Favorite Authors</label>
                    <input name="favoriteAuthors" value={editForm.favoriteAuthors} onChange={handleEditChange} placeholder="e.g., J.K. Rowling, Stephen King, Agatha Christie" />
                    <small className="form-help">Separate multiple authors with commas</small>
                  </div>
                  <div className="form-row">
                    <label>Languages Spoken</label>
                    <input name="languagesSpoken" value={editForm.languagesSpoken} onChange={handleEditChange} placeholder="e.g., English, Spanish, French" />
                    <small className="form-help">Separate multiple languages with commas</small>
                  </div>
                </div>
                <div className="form-section">
                  <h4>Privacy Settings</h4>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input type="checkbox" name="isPublic" checked={editForm.isPublic} onChange={handleEditChange} />
                      <span className="checkmark"></span>
                      Make profile public (visible to other users)
                    </label>
                  </div>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input type="checkbox" name="showReadingGoal" checked={editForm.showReadingGoal} onChange={handleEditChange} />
                      <span className="checkmark"></span>
                      Show reading goal on profile
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Who can message you?</label>
                    <select name="allowMessagesFrom" value={editForm.allowMessagesFrom} onChange={handleEditChange}>
                      <option value="Everyone">Everyone</option>
                      <option value="Followers">Followers only</option>
                      <option value="Nobody">Nobody</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Complete Profile'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="container">
          <div className="profile-main-info">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt={profileData.fullName} />
                ) : (
                  <div className="avatar-placeholder">
                    <span>{profileData.fullName.charAt(0)}</span>
                  </div>
                )}
                <div className={`online-status ${profileData.isOnline ? 'online' : 'offline'}`}></div>
              </div>
              {/* Camera overlay removed as requested */}
            </div>
            <div className="profile-info">
              <div className="profile-header-top">
                <h1 className="profile-name">{profileData.fullName}</h1>
                <div className="profile-badges">
                  <span className="user-badge reader">
                    <i className="fas fa-book-reader"></i>
                    Reader
                  </span>
                </div>
              </div>
              <p className="profile-username">@{profileData.username}</p>
              <div className="profile-meta">
                <div className="meta-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{profileData.location}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Joined {new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{profileData.isOnline ? 'Online now' : `Last seen ${profileData.lastSeen}`}</span>
                </div>
              </div>
              <div className="profile-actions">
                {isOwnProfile ? (
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    <i className="fas fa-edit"></i>
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary">
                      <i className="fas fa-user-plus"></i>
                      Follow
                    </button>
                    <button className="btn btn-secondary">
                      <i className="fas fa-comment"></i>
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Quick Stats */}
          <div className="profile-quick-stats card">
            <div className="stat-card">
              <div className="stat-number">{profileData?.readingStats?.totalBooks ?? profileData?.readingStats?.booksRead ?? 0}</div>
              <div className="stat-label">Books Read</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{userPosts.length}</div>
              <div className="stat-label">Posts</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{userGroups.length}</div>
              <div className="stat-label">Groups</div>
            </div>
            {/* Reviews removed as requested */}
            {/* Followers/Following removed as requested */}
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="profile-navigation">
        <div className="container nav-container">
          <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <i className="fas fa-home"></i>
            <span>Overview</span>
          </button>
          {/* Removed non-functional tabs */}
        </div>
      </div>

      {/* Profile Content */}
      <div className="profile-body">
        <div className="container profile-content-container">
          {activeTab === 'overview' && (
            <div className="overview-tab grid-2-cols">
              {/* About */}
              <div className="section-card card">
                <div className="section-header">
                  <h3><i className="fas fa-user"></i> About</h3>
                  {isOwnProfile && (
                    <button className="edit-btn">
                      <i className="fas fa-edit"></i>
                    </button>
                  )}
                </div>
                <p className="bio-text">{profileData.bio}</p>
              </div>

              {/* Reading Goal */}
              <div className="section-card card">
                <div className="section-header">
                  <h3><i className="fas fa-target"></i> Reading Goal</h3>
                </div>
                <div className="reading-goal">
                  <div className="goal-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(profileData?.readingStats?.readingGoal > 0) ? Math.min(100, (profileData.readingStats.goalProgress / profileData.readingStats.readingGoal) * 100) : 0}%` }} />
                    </div>
                    <div className="goal-text">
                      <span className="current">{profileData?.readingStats?.goalProgress ?? 0}</span>
                      <span className="separator">/</span>
                      <span className="target">{profileData?.readingStats?.readingGoal ?? 0} books</span>
                    </div>
                  </div>
                  <div className="goal-stats">
                    <div className="goal-stat">
                      <span className="label">Progress</span>
                      <span className="value">{(() => {
                        const goal = profileData?.readingStats?.readingGoal || 0;
                        const prog = profileData?.readingStats?.goalProgress || 0;
                        return goal > 0 ? Math.round((prog / goal) * 100) : 0;
                      })()}%</span>
                    </div>
                    <div className="goal-stat">
                      <span className="label">Streak</span>
                      <span className="value">{profileData?.readingStats?.readingStreak ?? 0} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Favorite Genres */}
              <div className="section-card card">
                <div className="section-header">
                  <h3><i className="fas fa-heart"></i> Favorite Genres</h3>
                </div>
                <div className="genres-grid">
                  {profileData.favoriteGenres.map((genre, index) => (
                    <div key={index} className="genre-card">
                      <div className={`genre-icon bg-gradient-to-br ${genre.color || ''}`}>
                        <i className="fas fa-bookmark"></i>
                      </div>
                      <div className="genre-info">
                        <h4 className="genre-name">{genre.name}</h4>
                        <p className="genre-count">{genre.count} books</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Posts */}
              <div className="section-card card">
                <div className="section-header">
                  <h3><i className="fas fa-pencil-alt"></i> Recent Posts</h3>
                </div>
                {userPosts.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No posts yet.</p>
                ) : (
                  <div className="currently-reading-grid">
                    {userPosts.slice(0, 5).map((post) => (
                      <div key={post._id} className="reading-book-card" style={{ alignItems: 'flex-start' }}>
                        <div className="book-info">
                          <p className="book-title" style={{ marginBottom: 6 }}>{post.content}</p>
                          <p className="book-author" style={{ fontSize: 12 }}>
                            {new Date(post.createdAt).toLocaleString()} {post.group ? `· in ${post.group?.name || ''}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Groups */}
              <div className="section-card card">
                <div className="section-header">
                  <h3><i className="fas fa-users"></i> Groups</h3>
                </div>
                {userGroups.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>Not a member of any groups yet.</p>
                ) : (
                  <div className="genres-grid">
                    {userGroups.map((g) => (
                      <div key={g._id} className="genre-card">
                        <div className="genre-icon" style={{ background: 'linear-gradient(135deg, #2e3192, #00b1b0)', color: 'white' }}>
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="genre-info">
                          <h4 className="genre-name">{g.name}</h4>
                          <p className="genre-count">{(g.members || []).length} members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="close-btn" onClick={() => setIsEditing(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProfile} className="modal-form">
              <div className="form-row">
                <label>Full Name</label>
                <input name="fullName" value={editForm.fullName} onChange={handleEditChange} />
              </div>
              <div className="form-row">
                <label>Bio</label>
                <textarea name="bio" value={editForm.bio} onChange={handleEditChange} rows={4} />
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Location</label>
                  <input name="location" value={editForm.location} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Date of Birth</label>
                  <input name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={handleEditChange} />
                </div>
                <div className="form-row">
                  <label>Time Zone</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select name="timeZone" value={editForm.timeZone} onChange={handleEditChange} style={{ flex: 1 }}>
                      {(!showAllTimezones ? [
                        { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, India)' },
                        { value: 'Asia/Dhaka', label: 'Asia/Dhaka (Bangladesh)' },
                        { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan)' },
                        { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
                        { value: 'Europe/London', label: 'Europe/London (UK)' },
                        { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
                        { value: 'America/New_York', label: 'America/New_York (ET)' },
                        { value: 'America/Chicago', label: 'America/Chicago (CT)' },
                        { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
                        { value: 'Australia/Sydney', label: 'Australia/Sydney' },
                      ] : (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone').map(z => ({ value: z, label: z })) : [
                        { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, India)' }
                      ])).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <input type="checkbox" checked={showAllTimezones} onChange={e => setShowAllTimezones(e.target.checked)} />
                      Show all timezones
                    </label>
                  </div>
                  <small className="form-help">Default is India Standard Time (Asia/Kolkata)</small>
                </div>
                <div className="form-row">
                  <label>Reading Goal</label>
                  <input name="readingGoal" type="number" value={editForm.readingGoal} onChange={handleEditChange} />
                </div>
              </div>
              <div className="form-section">
                <h4>Privacy Settings</h4>
                <div className="form-row checkbox-row">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isPublic" checked={editForm.isPublic} onChange={handleEditChange} />
                    <span className="checkmark"></span>
                    Make profile public (visible to other users)
                  </label>
                </div>
                <div className="form-row checkbox-row">
                  <label className="checkbox-label">
                    <input type="checkbox" name="showReadingGoal" checked={editForm.showReadingGoal} onChange={handleEditChange} />
                    <span className="checkmark"></span>
                    Show reading goal on profile
                  </label>
                </div>
                <div className="form-row">
                  <label>Who can message you?</label>
                  <select name="allowMessagesFrom" value={editForm.allowMessagesFrom} onChange={handleEditChange}>
                    <option value="Everyone">Everyone</option>
                    <option value="Followers">Followers only</option>
                    <option value="Nobody">Nobody</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}