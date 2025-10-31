import { useEffect, useMemo, useState } from "react";
import "../index.css";
import type { EmojiItem } from "../types";
import { useDebounce } from "../hooks/useDebounce";
// import Fuse from "fuse.js";
// import type { IFuseOptions } from "fuse.js";
import {
  getEmojis,
  getFavorites,
  toggleFavorite,
  logoutUser,
} from "../services/api";
import { useNavigate } from "react-router-dom";

// ✅ Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function EmojiSearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 250);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [emojisRes, favsRes] = await Promise.all([
          getEmojis(),
          getFavorites(),
        ]);
        setEmojis(emojisRes.data);
        setFavorites(new Set(favsRes.data?.favorites || []));
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
      setError("Failed to logout. Please try again.");
    }
  };

  // const fuse = useMemo(() => {
  //   const options: IFuseOptions<EmojiItem> = {
  //     keys: ["name", "keywords", "slug"],
  //     threshold: 0.34,
  //     includeScore: true,
  //   };

  //   return new Fuse(emojis, options);
  // }, [emojis]);

  const searchResults = useMemo(() => {
    if (!debouncedQ) return emojis;

    const lowerCaseQ = debouncedQ.toLowerCase();

    return emojis.filter((emoji) => {
      return emoji.name.toLowerCase().startsWith(lowerCaseQ);
    });
  }, [debouncedQ, emojis]);

  const displayedEmojis = useMemo(() => {
    if (showFavorites && favorites.size === 0) return [];
    if (showFavorites) {
      return searchResults.filter((emoji) => favorites.has(emoji.slug));
    }
    return searchResults;
  }, [searchResults, showFavorites, favorites]);

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
    return (
      <div className="flex h-screen items-center justify-center text-lg text-gray-400 bg-slate-900">
        Loading emojis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400 bg-slate-900">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-6">
      <Card className="max-w-6xl mx-auto shadow-2xl bg-slate-800/70 backdrop-blur-sm border border-indigo-700/50 rounded-xl">
        <CardContent className="p-6 space-y-6">
          <header className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-3xl font-bold text-cyan-400">Emoji Search</h1>
            <div className="space-x-3 flex-shrink-0">
              <Button
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-slate-700/50 transition-all"
                onClick={handleLogout}
              >
                Logout
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 transition-all"
                onClick={() => navigate("/post")}
              >
                Create Post
              </Button>
            </div>
          </header>

          <Separator className="bg-indigo-600/40" />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Input
                type="text"
                placeholder="Search emojis..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white placeholder:text-gray-400 focus:border-cyan-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={showFavorites}
                onCheckedChange={setShowFavorites}
                id="favorites-switch"
                className="data-[state=checked]:bg-cyan-600"
              />
              <Label
                htmlFor="favorites-switch"
                className="text-sm text-gray-300"
              >
                Favorites only ({favorites.size})
              </Label>
            </div>
          </div>

          {/* ✅ Emoji Cards Grid */}
          <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 mt-6">
            {displayedEmojis.length === 0 ? (
              <p className="col-span-full text-center text-gray-400 p-6">
                {showFavorites ? "No favorite emojis yet!" : "No emojis found"}
              </p>
            ) : (
              displayedEmojis.map((emoji) => {
                // ✅ Handle possible key variations (character, emoji, symbol)
                const emojiChar =
                  (emoji as any).character ||
                  (emoji as any).emoji ||
                  (emoji as any).symbol ||
                  "❓";

                return (
                  <Card
                    key={emoji.slug}
                    className="bg-slate-700/50 border border-slate-600/50 text-white hover:shadow-xl hover:scale-[1.03] transition-all duration-200 rounded-lg"
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="text-5xl mb-3">{emojiChar}</div>
                      <h3 className="text-base font-medium mb-2 text-cyan-300">
                        {emoji.name}
                      </h3>
                      <Button
                        variant="ghost"
                        onClick={() => handleToggleFavorite(emoji.slug)}
                        className={`text-sm ${
                          favorites.has(emoji.slug)
                            ? "text-yellow-400 hover:bg-slate-600/50"
                            : "text-gray-400 hover:text-cyan-400 hover:bg-slate-600/50"
                        }`}
                      >
                        {favorites.has(emoji.slug)
                          ? "★ Favorite"
                          : "☆ Add Favorite"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </main>
        </CardContent>
      </Card>
    </div>
  );
}
