import React, { useState, useEffect } from 'react';
import DiaryPage from './DiaryPage';
import './Diary.css';

export default function DiaryBook({ days, stats, user }) {
  const [currentSpread, setCurrentSpread] = useState(0);

  // We need an array of pages.
  // Page 0 (Left, Spread 0) = Inside Cover
  // Page 1 (Right, Spread 0) = Day 0
  // Page 2 (Left, Spread 1) = Day 1
  // Page 3 (Right, Spread 1) = Day 2
  // ...
  const pages = [];
  pages.push({ isCover: true });
  days.forEach(d => pages.push({ isDay: true, data: d }));
  
  if (pages.length % 2 !== 0) {
    pages.push({ isDay: true, data: { dayLabel: 'The Future', activities: [{ text: 'To be written...', icon: '✨', type: 'quiet_day' }], mood: 'quiet' } });
  }

  const totalSpreads = Math.ceil(pages.length / 2);

  const goToNext = () => {
    if (currentSpread < totalSpreads - 1) {
      setCurrentSpread(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentSpread > 0) {
      setCurrentSpread(prev => prev - 1);
    }
  };

  const goToToday = () => {
    setCurrentSpread(totalSpreads - 1);
  };

  useEffect(() => {
    // Start at the end (Today) by default
    setCurrentSpread(totalSpreads > 0 ? totalSpreads - 1 : 0);
  }, [totalSpreads]);

  const getMoodClass = (page) => {
    if (page?.isCover) return 'diary-mood-steady';
    return page?.data?.mood ? `diary-mood-${page.data.mood}` : 'diary-mood-steady';
  };

  return (
    <div className="diary-wrapper">
      <div className="diary-controls">
        <button onClick={goToPrev} disabled={currentSpread === 0}>
          <i className="fas fa-chevron-left" /> Previous
        </button>
        <span className="diary-title">My Reading Diary</span>
        <button onClick={goToToday} disabled={currentSpread === totalSpreads - 1}>
          Today
        </button>
        <button onClick={goToNext} disabled={currentSpread === totalSpreads - 1}>
          Next <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="diary-book-container">
        <div className="diary-book">
          {Array.from({ length: totalSpreads }).map((_, spreadIdx) => {
            const leftPage = pages[spreadIdx * 2];
            const rightPage = pages[spreadIdx * 2 + 1];

            // If the spread is BEFORE currentSpread, it means it has been flipped to the left.
            const isFlipped = spreadIdx < currentSpread;
            // The currently active spread is `currentSpread`
            // Spreads > currentSpread are waiting on the right
            const isVisible = Math.abs(spreadIdx - currentSpread) <= 1;

            if (!isVisible) return null;

            return (
              <div 
                key={spreadIdx} 
                className={`diary-leaf ${isFlipped ? 'flipped' : ''}`}
                style={{ 
                  zIndex: isFlipped ? spreadIdx : totalSpreads - spreadIdx 
                }}
              >
                {/* Front of the leaf is the Right Page of this spread */}
                <div className={`diary-leaf-front ${getMoodClass(rightPage)}`}>
                  <DiaryPage 
                    pageInfo={rightPage?.data} 
                    pageNumber={spreadIdx * 2 + 1}
                    isCover={rightPage?.isCover}
                    user={user}
                    stats={stats}
                  />
                </div>

                {/* Back of the leaf is the Left Page of the NEXT spread */}
                <div className={`diary-leaf-back ${getMoodClass(pages[(spreadIdx + 1) * 2])}`}>
                  {spreadIdx + 1 < totalSpreads && (
                    <DiaryPage 
                      pageInfo={pages[(spreadIdx + 1) * 2]?.data}
                      pageNumber={(spreadIdx + 1) * 2}
                      isCover={pages[(spreadIdx + 1) * 2]?.isCover}
                      user={user}
                      stats={stats}
                    />
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Static Left Page (for the very first page / Inside Cover) */}
          <div className={`diary-page left ${getMoodClass(pages[0])}`} style={{ zIndex: 0 }}>
            <DiaryPage 
              pageInfo={pages[0]?.data} 
              pageNumber={0}
              isCover={pages[0]?.isCover}
              user={user}
              stats={stats}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
