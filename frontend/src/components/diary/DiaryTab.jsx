import React, { useState, useEffect } from 'react';
import DiaryBook from './DiaryBook';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function DiaryTab({ userId, user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diaryData, setDiaryData] = useState({ days: [], stats: null });

  useEffect(() => {
    let isMounted = true;
    
    const fetchDiary = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      
      try {
        // Fetch last 14 days by default
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 13); // 14 days total including today

        const startStr = start.toISOString();
        const endStr = end.toISOString();

        const [rangeRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/api/diary/${userId}/range?start=${startStr}&end=${endStr}`),
          fetch(`${API_BASE}/api/diary/${userId}/summary`)
        ]);

        if (!rangeRes.ok || !summaryRes.ok) {
          throw new Error('Failed to load reading diary');
        }

        const rangeData = await rangeRes.json();
        const summaryData = await summaryRes.json();

        if (isMounted) {
          setDiaryData({
            days: rangeData.days || [],
            stats: summaryData.stats || null,
            startDate: summaryData.startDate
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDiary();

    return () => { isMounted = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="tab-panel" style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div className="loading-spinner-large"></div>
        <p style={{ marginLeft: 16 }}>Dusting off the diary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-panel">
        <div className="section-card card" style={{ textAlign: 'center' }}>
          <h3>Reading Diary Unavailable</h3>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel" style={{ padding: 0 }}>
      <DiaryBook 
        days={diaryData.days} 
        stats={{ ...diaryData.stats, startDate: diaryData.startDate }} 
        user={user} 
      />
    </div>
  );
}
