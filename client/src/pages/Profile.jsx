import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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
    timeZone: 'Asia/Kolkata',
    favoriteAuthors: '',
    languagesSpoken: '',
    favoriteGenres: ''
  });
  const [showAllTimezones, setShowAllTimezones] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [userComments, setUserComments] = useState([]);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      const resolvedId = userId || user?._id || user?.id;
      if (!resolvedId) return;
      setIsLoading(true);
      try {
  const resp = await fetch(`${API_BASE}/api/profiles/${resolvedId}`);
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
          timeZone: data.timeZone || '',
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          favoriteGenres: data.favoriteGenres || [],
          favoriteAuthors: data.favoriteAuthors || [],
          languagesSpoken: data.languagesSpoken || [],
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
          timeZone: data.timeZone || 'Asia/Kolkata',
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
  }, [userId, user, API_BASE]);

  // Load related data: user's posts and groups
  useEffect(() => {
    const resolvedId = userId || user?._id || user?.id;
    if (!resolvedId) return;

    (async () => {
      try {
  const resp = await fetch(`${API_BASE}/api/posts`);
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
  const resp = await fetch(`${API_BASE}/api/groups`);
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

    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/comments`);
        if (!resp.ok) return;
        const allComments = await resp.json();
        const mine = (allComments || []).filter(c => {
          const authorId = c?.author?._id || c?.author;
          return authorId && authorId.toString() === resolvedId.toString();
        });
        setUserComments(mine);
      } catch {
        // ignore
      }
    })();
  }, [userId, user, API_BASE]);

  const isOwnProfile = !userId || userId === (user?._id || user?.id);
  const canMessage = !isOwnProfile;
  const navSections = [
    { key: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { key: 'favorites', label: 'Favorites', icon: 'fas fa-star' },
    { key: 'activity', label: 'Activity', icon: 'fas fa-stream' },
    { key: 'clubs', label: 'Clubs', icon: 'fas fa-users' },
  ];

  const favoriteGenres = Array.isArray(profileData?.favoriteGenres)
    ? profileData.favoriteGenres
        .map((genre) => (typeof genre === 'string' ? genre : genre?.name))
        .filter(Boolean)
    : [];

  const favoriteAuthorsList = Array.isArray(profileData?.favoriteAuthors)
    ? profileData.favoriteAuthors.filter((author) => !!author)
    : [];

  const languagesList = Array.isArray(profileData?.languagesSpoken)
    ? profileData.languagesSpoken.filter((lang) => !!lang)
    : [];

  const lastSeenLabel = profileData?.isOnline
    ? 'Online now'
    : profileData?.lastSeen
      ? `Last seen ${new Date(profileData.lastSeen).toLocaleString()}`
      : 'Recently active';

  const socialStats = profileData?.socialStats || {};
  
  // Calculate moderator count
  const moderatorCount = userGroups.filter(g => {
    const moderators = g?.moderators || [];
    const resolvedId = userId || user?._id || user?.id;
    return moderators.some(mod => {
      const modId = mod?._id || mod;
      return modId && modId.toString() === resolvedId?.toString();
    });
  }).length;

  // Find most popular post (by comment count)
  const postCommentCounts = userPosts.map(post => {
    const postId = post?._id;
    const commentCount = userComments.filter(c => {
      const cPostId = c?.post?._id || c?.post;
      return cPostId && cPostId.toString() === postId?.toString();
    }).length;
    return { post, commentCount };
  });
  const topPost = postCommentCounts.reduce((max, curr) => 
    curr.commentCount > (max?.commentCount || 0) ? curr : max, 
    { commentCount: 0 }
  );

  const quickStats = [
    { key: 'posts', label: 'Posts', value: userPosts.length, icon: 'fas fa-pen', clickable: false },
    { key: 'clubs', label: 'Clubs', value: userGroups.length, icon: 'fas fa-users', clickable: false },
    { 
      key: 'moderating', 
      label: 'Moderating', 
      value: moderatorCount, 
      icon: 'fas fa-shield-alt', 
      clickable: false 
    },
    { 
      key: 'topPost', 
      label: 'Top Post', 
      value: topPost.commentCount > 0 ? `${topPost.commentCount} comments` : '0 comments',
      preview: topPost.post?.content ? topPost.post.content.substring(0, 50) + '...' : null,
      icon: 'fas fa-fire', 
      clickable: topPost.commentCount > 0,
      postId: topPost.post?._id
    },
  ];


  const highlightItems = [
    {
      icon: 'fas fa-map-marker-alt',
      label: 'Location',
      value: profileData?.location || 'Not added yet',
    },
    {
      icon: 'fas fa-globe',
      label: 'Time Zone',
      value: profileData?.timeZone || 'Not set',
    },
    {
      icon: 'fas fa-language',
      label: 'Languages',
      value: languagesList.length ? languagesList.join(', ') : 'Not added yet',
    },
    {
      icon: 'fas fa-calendar-alt',
      label: 'Member Since',
      value: profileData?.joinDate
        ? new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown',
    },
    {
      icon: 'fas fa-eye',
      label: 'Visibility',
      value: profileData?.isPublic ? 'Public profile' : 'Private profile',
    },
    {
      icon: 'fas fa-clock',
      label: 'Status',
      value: lastSeenLabel,
    },
  ];

  const handleStartMessage = async () => {
    if (isOwnProfile) return;
    const currentUserId = user?._id || user?.id;
    if (!currentUserId || !profileData?.id) return;
    try {
      const resp = await fetch(`${API_BASE}/api/chat/conversations/dm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [currentUserId, profileData.id] })
      });
      if (resp.ok) {
        const conversation = await resp.json();
        if (conversation?._id) {
          navigate(`/chat?conversation=${conversation._id}`);
        } else {
          navigate('/chat');
        }
      } else {
        const error = await resp.json().catch(() => ({}));
        alert(error?.message || 'Unable to start chat right now.');
      }
    } catch (err) {
      console.error('Failed to start conversation', err);
      alert('Unable to start chat right now.');
    }
  };

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
        timeZone: editForm.timeZone,
        favoriteAuthors: editForm.favoriteAuthors.split(',').map(a => a.trim()).filter(a => a),
        languagesSpoken: editForm.languagesSpoken.split(',').map(l => l.trim()).filter(l => l),
        favoriteGenres: editForm.favoriteGenres.split(',').map(g => ({ name: g.trim() })).filter(g => g.name),
      };
  const resp = await fetch(`${API_BASE}/api/profiles/${resolvedId}`, {
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
    isPublic: updated.isPublic,
        favoriteGenres: updated.favoriteGenres || prev.favoriteGenres,
        favoriteAuthors: updated.favoriteAuthors || prev.favoriteAuthors,
        languagesSpoken: updated.languagesSpoken || prev.languagesSpoken,
      }));
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileForm = (variant = 'setup') => {
    const isEditVariant = variant === 'edit';
    const title = isEditVariant ? 'Edit Profile' : 'Complete Your Profile';
    const subtitle = isEditVariant
      ? 'Keep your profile details current so fellow readers can connect better.'
      : 'Tell us about yourself to connect with other readers';
    const submitLabel = isEditVariant ? 'Save Changes' : 'Complete Profile';
    const iconClass = isEditVariant ? 'fas fa-user-cog' : 'fas fa-user-edit';

    return (
      <div className={`setup-form-card ${isEditVariant ? 'profile-edit-card' : ''}`}>
        <div className="setup-form-header">
          <h3><i className={iconClass}></i>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <form onSubmit={handleSaveProfile} className="setup-form">
          <div className="form-row">
            <label>Full Name</label>
            <input
              name="fullName"
              value={editForm.fullName}
              onChange={handleEditChange}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-row">
            <label>Bio</label>
            <textarea
              name="bio"
              value={editForm.bio}
              onChange={handleEditChange}
              rows={4}
              placeholder="Tell us about yourself, your reading interests, etc."
            />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Location</label>
              <input
                name="location"
                value={editForm.location}
                onChange={handleEditChange}
                placeholder="City, Country"
              />
            </div>
            <div className="form-row">
              <label>Date of Birth</label>
              <input
                name="dateOfBirth"
                type="date"
                value={editForm.dateOfBirth}
                onChange={handleEditChange}
              />
            </div>
            <div className="form-row">
              <label>Time Zone</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="timeZone" value={editForm.timeZone} onChange={handleEditChange} style={{ flex: '1 1 240px' }}>
                  {(!showAllTimezones ? [
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, India)' },
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
                  <input
                    type="checkbox"
                    checked={showAllTimezones}
                    onChange={e => setShowAllTimezones(e.target.checked)}
                  />
                  Show all timezones
                </label>
              </div>
              <small className="form-help">Default is India Standard Time (Asia/Kolkata)</small>
            </div>
          </div>
          <div className="form-section">
            <h4>Reading Preferences</h4>
            <div className="form-row">
              <label>Favorite Genres</label>
              <input
                name="favoriteGenres"
                value={editForm.favoriteGenres}
                onChange={handleEditChange}
                placeholder="e.g., Fantasy, Science Fiction, Romance"
              />
              <small className="form-help">Separate multiple genres with commas</small>
            </div>
            <div className="form-row">
              <label>Favorite Authors</label>
              <input
                name="favoriteAuthors"
                value={editForm.favoriteAuthors}
                onChange={handleEditChange}
                placeholder="e.g., J.K. Rowling, Stephen King, Agatha Christie"
              />
              <small className="form-help">Separate multiple authors with commas</small>
            </div>
            <div className="form-row">
              <label>Languages Spoken</label>
              <input
                name="languagesSpoken"
                value={editForm.languagesSpoken}
                onChange={handleEditChange}
                placeholder="e.g., English, Spanish, French"
              />
              <small className="form-help">Separate multiple languages with commas</small>
            </div>
          </div>
          <div className="form-section">
            <h4>Privacy Settings</h4>
            <div className="form-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={editForm.isPublic}
                  onChange={handleEditChange}
                />
                <span className="checkmark"></span>
                Make profile public (visible to other users)
              </label>
            </div>
          </div>
          <div className="form-actions">
            {isEditVariant && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    );
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

  const isProfileEmpty = !profileData.bio && !profileData.location;

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
            {renderProfileForm('setup')}
          </div>
        </div>
      </div>
    );
  }

  if (!isOwnProfile && profileData.isPublic === false) {
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
              </div>
            </div>
          </div>
        </div>
        <div className="profile-body">
          <div className="container profile-content-container">
            <div className="section-card card" style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: 12 }}>This profile is private</h3>
              <p style={{ color: '#6b7280' }}>Follow requests and additional details are hidden at the reader&apos;s request.</p>
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
              </div>
              <p className="profile-username">@{profileData.username}</p>
              <div className="profile-meta">
                {profileData.location && (
                  <div className="meta-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{profileData.location}</span>
                  </div>
                )}
                {profileData.timeZone && (
                  <div className="meta-item">
                    <i className="fas fa-globe"></i>
                    <span>{profileData.timeZone}</span>
                  </div>
                )}
                <div className="meta-item">
                  <i className="fas fa-calendar-alt"></i>
                  <span>
                    Joined {profileData.joinDate
                      ? new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : 'Recently'}
                  </span>
                </div>
                <div className="meta-item">
                  <i className="fas fa-clock"></i>
                  <span>{lastSeenLabel}</span>
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
                    <button
                      className="btn btn-secondary"
                      disabled={!canMessage}
                      title={canMessage ? 'Send Message' : 'You cannot message yourself'}
                      onClick={handleStartMessage}
                    >
                      <i className="fas fa-comment"></i>
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Quick Stats */}
          <div className="profile-quick-stats">
            {quickStats.map((stat) => {
              const displayValue = typeof stat.value === 'number' ? stat.value : stat.value;
              const isClickable = stat.clickable && stat.postId;
              const cardClasses = `quick-stat-card ${isClickable ? 'clickable' : ''}`;
              
              const handleClick = () => {
                if (isClickable) {
                  navigate(`/posts/${stat.postId}`);
                }
              };

              return (
                <div 
                  key={stat.key} 
                  className={cardClasses}
                  onClick={handleClick}
                  style={{ cursor: isClickable ? 'pointer' : 'default' }}
                  title={stat.preview || ''}
                >
                  <span className="stat-icon">
                    <i className={stat.icon}></i>
                  </span>
                  <div className="stat-details">
                    <span className="stat-value">{displayValue}</span>
                    <span className="stat-label">{stat.label}</span>
                    {stat.preview && (
                      <span className="stat-preview">{stat.preview}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="profile-navigation">
        <div className="container nav-container">
          {navSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`nav-tab ${activeTab === section.key ? 'active' : ''}`}
              onClick={() => setActiveTab(section.key)}
            >
              <i className={section.icon}></i>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Content */}
      <div className="profile-body">
        <div className="container profile-content-container">
          {isEditing && (
            <div className="profile-edit-card-wrapper">
              {renderProfileForm('edit')}
            </div>
          )}

          <div className="tab-panels">
            {activeTab === 'overview' && (
              <div className="tab-panel">
                <div className="panel-grid">
                  <section className="profile-section wide-card profile-section-about">
                    <div className="profile-section-header">
                      <span className="section-icon"><i className="fas fa-user"></i></span>
                      <div>
                        <h3>About</h3>
                        <p>Your bookish identity at a glance</p>
                      </div>
                    </div>
                    <p className="bio-text">{profileData.bio || 'This reader hasn’t shared a bio yet.'}</p>
                  </section>

                  <section className="profile-section profile-section-highlights">
                    <div className="profile-section-header">
                      <span className="section-icon"><i className="fas fa-compass"></i></span>
                      <div>
                        <h3>Highlights</h3>
                        <p>Fast facts to help others connect with you</p>
                      </div>
                    </div>
                    <ul className="info-list">
                      {highlightItems.map((item) => (
                        <li key={item.label}>
                          <span className="info-icon"><i className={item.icon}></i></span>
                          <div>
                            <p className="info-title">{item.label}</p>
                            <p className="info-text">{item.value}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Top Genres removed - shown in Favorites tab */}
                  {/* Currently Reading removed per latest requirements */}
                </div>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="tab-panel">
                <section className="profile-section wide-card">
                  <div className="profile-section-header">
                    <span className="section-icon"><i className="fas fa-bookmark"></i></span>
                    <div>
                      <h3>Favorite Genres</h3>
                      <p>Genres that always capture your imagination</p>
                    </div>
                  </div>
                  {favoriteGenres.length > 0 ? (
                    <div className="tag-grid">
                      {favoriteGenres.map((genre) => (
                        <span key={genre} className="chip large">{genre}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No favorite genres added yet.</p>
                  )}
                </section>

                <section className="profile-section wide-card">
                  <div className="profile-section-header">
                    <span className="section-icon"><i className="fas fa-feather"></i></span>
                    <div>
                      <h3>Favorite Authors</h3>
                      <p>Creators whose words resonate with you</p>
                    </div>
                  </div>
                  {favoriteAuthorsList.length > 0 ? (
                    <div className="chip-row">
                      {favoriteAuthorsList.map((author) => (
                        <span key={author} className="chip">{author}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No favorite authors added yet.</p>
                  )}
                </section>

                <section className="profile-section wide-card">
                  <div className="profile-section-header">
                    <span className="section-icon"><i className="fas fa-language"></i></span>
                    <div>
                      <h3>Languages</h3>
                      <p>Languages you read and speak</p>
                    </div>
                  </div>
                  {languagesList.length > 0 ? (
                    <div className="chip-row">
                      {languagesList.map((language) => (
                        <span key={language} className="chip subtle">{language}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No languages listed yet.</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="tab-panel">
                <section className="profile-section wide-card">
                  <div className="profile-section-header">
                    <span className="section-icon"><i className="fas fa-stream"></i></span>
                    <div>
                      <h3>Recent Posts</h3>
                      <p>Thoughts and highlights you've shared</p>
                    </div>
                  </div>
                  {userPosts.length === 0 ? (
                    <p className="empty-state">No posts yet.</p>
                  ) : (
                    <div className="activity-feed">
                      {userPosts.map((post) => (
                        <article key={post._id} className="activity-card">
                          <div className="activity-icon">
                            <i className="fas fa-pen"></i>
                          </div>
                          <div className="activity-content">
                            <p className="activity-text">{post.content}</p>
                            <p className="activity-meta">
                              {new Date(post.createdAt).toLocaleString()}
                              {post.group ? ` · ${post.group?.name || ''}` : ''}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'clubs' && (
              <div className="tab-panel">
                <section className="profile-section wide-card">
                  <div className="profile-section-header">
                    <span className="section-icon"><i className="fas fa-users"></i></span>
                    <div>
                      <h3>Clubs & Communities</h3>
                      <p>Groups where you share conversations</p>
                    </div>
                  </div>
                  {userGroups.length === 0 ? (
                    <p className="empty-state">Not a member of any clubs yet.</p>
                  ) : (
                    <div className="club-grid">
                      {userGroups.map((group) => (
                        <div key={group._id} className="club-card">
                          <div className="club-header">
                            <span className="club-icon"><i className="fas fa-users"></i></span>
                            <div>
                              <p className="club-name">{group.name}</p>
                              <p className="club-meta">{(group.members || []).length} members</p>
                            </div>
                          </div>
                          {group.description && (
                            <p className="club-description">{group.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}