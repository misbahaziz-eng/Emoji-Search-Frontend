import { useEffect, useMemo, useState } from "react";
import "../styles/main.css";
import type { EmojiItem } from "../types";
import SearchBar from "../components/SearchBar";
import EmojiGrid from "../components/EmojiGrid";
import { useDebounce } from "../hooks/useDebounce";
import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";
import { getEmojis, getFavorites, toggleFavorite } from "../services/api";

export default function EmojiSearchPage() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 250);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Fetch both emojis and favorites on component mount
  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [emojisRes, favsRes] = await Promise.all([
          getEmojis(),
          getFavorites(),
        ]);
        console.log("Favorites response:", favsRes.data);
        console.log("Favorites list:", favsRes.data.favorites);

        setEmojis(emojisRes.data);
        setFavorites(new Set(favsRes.data.favorites));
        setError(null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError("Failed to load emojis. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  const fuse = useMemo(() => {
    const options: IFuseOptions<EmojiItem> = {
      keys: ["name", "keywords", "slug"],
      threshold: 0.34,
      includeScore: true,
    };
    return new Fuse(emojis, options);
  }, [emojis]);

  const searchResults = useMemo(() => {
    if (!debouncedQ) return emojis;
    return fuse.search(debouncedQ).map((r) => r.item);
  }, [debouncedQ, fuse, emojis]);

  // Filter favorites based on showFavorites toggle
  const displayedEmojis = useMemo(() => {
    if (showFavorites) {
      return searchResults.filter((emoji) => favorites.has(emoji.slug));
    }
    return searchResults;
  }, [searchResults, showFavorites, favorites]);

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [emojisRes, favsRes] = await Promise.all([
          getEmojis(),
          getFavorites(),
        ]);

        // Add defensive check for null/undefined favorites
        const favoritesList = favsRes.data?.favorites || [];
        console.log("Favorites response:", favsRes.data);
        console.log("Favorites list:", favoritesList);

        setEmojis(emojisRes.data);
        setFavorites(new Set(favoritesList)); // Use the safe list
        setError(null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError("Failed to load emojis. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);
  // Also update the toggle handler to be more defensive
  async function handleToggleFavorite(slug: string) {
    try {
      const res = await toggleFavorite(slug);
      const newFavorites = res.data?.favorites || [];
      setFavorites(new Set(newFavorites));
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      setError("Failed to update favorites. Please try again.");
    }
  }

  if (loading) {
    return <div className="loading">Loading emojis...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Emoji Search</h1>
        <div className="controls">
          <SearchBar value={q} onChange={setQ} />
          <label className="favorites-toggle">
            <input
              type="checkbox"
              checked={showFavorites}
              onChange={(e) => setShowFavorites(e.target.checked)}
            />
            Favorites only ({favorites.size})
          </label>
        </div>
      </header>

      <main>
        {displayedEmojis.length === 0 ? (
          <p className="no-results">
            {showFavorites ? "No favorite emojis yet!" : "No emojis found"}
          </p>
        ) : (
          <EmojiGrid
            items={displayedEmojis}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </main>
    </div>
  );
}
