import React, { useState } from 'react';
import './BookSearch.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function BookSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter a title, author, or keyword to search.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/books/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to search books');
      }
      setBooks(data.books || []);
    } catch (err) {
      setError(err.message || 'Unable to search books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="book-search-shell">
      <form className="book-search-bar" onSubmit={handleSearch}>
        <div className="book-search-field">
          <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, authors, or subjects"
          />
        </div>
        <button type="submit" className="book-search-submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
        {onClose && (
          <button type="button" className="book-search-close" onClick={onClose}>
            Close
          </button>
        )}
      </form>

      {error && <div className="book-search-error">{error}</div>}

      <div className="book-search-results">
        {books.length === 0 && !loading ? (
          <div className="book-search-empty">Search for a book to begin a reading session.</div>
        ) : null}

        {books.map((book) => (
          <button key={book.id} type="button" className="book-search-card" onClick={() => onSelect?.(book)}>
            <div className="book-search-cover">
              {book.coverImage ? <img src={book.coverImage} alt={book.title} /> : <span>{book.title?.[0] || 'B'}</span>}
            </div>
            <div className="book-search-details">
              <h4>{book.title}</h4>
              <p>{(book.authors || []).join(', ') || 'Unknown author'}</p>
              <span>{book.pageCount ? `${book.pageCount} pages` : 'Page count unavailable'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}