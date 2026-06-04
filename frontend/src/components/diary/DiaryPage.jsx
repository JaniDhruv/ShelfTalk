import React from 'react';

const getAvatarInitial = (name) => {
  return name ? name.charAt(0).toUpperCase() : 'R';
};

export default function DiaryPage({ pageInfo, pageNumber, isCover, user, stats }) {
  if (isCover) {
    return (
      <div className="diary-page-content">
        <div className="diary-cover-stats">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} className="diary-avatar" />
          ) : (
            <div className="diary-avatar" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #722f37, #b8860b)',
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: 'bold'
            }}>
              {getAvatarInitial(user?.fullName || user?.username)}
            </div>
          )}
          
          <h2 className="diary-cover-title">The Reading Story of {user?.username}</h2>
          <div className="diary-cover-subtitle">
            Started {stats?.startDate ? new Date(stats.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
          </div>

          <div className="diary-stats-grid">
            <div className="diary-stat-box">
              <span className="diary-stat-value">{stats?.booksFinished || 0}</span>
              <span className="diary-stat-label">Books Finished</span>
            </div>
            <div className="diary-stat-box">
              <span className="diary-stat-value">{stats?.pagesRead || 0}</span>
              <span className="diary-stat-label">Pages Read</span>
            </div>
            <div className="diary-stat-box">
              <span className="diary-stat-value">{stats?.postsWritten || 0}</span>
              <span className="diary-stat-label">Posts Written</span>
            </div>
            <div className="diary-stat-box">
              <span className="diary-stat-value">{stats?.reactionsDropped || 0}</span>
              <span className="diary-stat-label">Reactions Dropped</span>
            </div>
          </div>
        </div>
        {pageNumber && <div className="diary-page-number">{pageNumber}</div>}
      </div>
    );
  }

  // Milestone or Daily page
  const { date, dayLabel, activities, isMilestone, milestoneData } = pageInfo;

  return (
    <div className="diary-page-content">
      <div className="diary-date-header">
        {dayLabel}
      </div>

      {isMilestone && milestoneData && (
        <div className="diary-milestone-decor">
          <h3>🎉 Milestone Reached!</h3>
          {milestoneData.coverImage && (
            <img 
              src={`http://localhost:5000/uploads/library/${milestoneData.coverImage}`} 
              alt={milestoneData.bookTitle} 
              className="diary-milestone-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <p style={{ fontSize: '1.2rem', color: '#722f37', fontWeight: 600 }}>
            {milestoneData.text}
          </p>
        </div>
      )}

      {!isMilestone && (
        <div className="diary-activity-list">
          {activities.map((act, idx) => (
            <div key={idx} className="diary-activity-item">
              <span className="diary-activity-icon">{act.icon}</span>
              <span>{act.text}</span>
            </div>
          ))}
        </div>
      )}

      {pageNumber && <div className="diary-page-number">{pageNumber}</div>}
    </div>
  );
}
