import { useEffect, useRef, useState } from "react";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  reactToPost,
  getEmojis,
} from "../services/api";

interface Reaction {
  emoji: string;
  users: string[];
}

interface Post {
  _id: string;
  content: string;
  createdBy?: { _id?: string; username?: string } | string | null;
  reactions?: Reaction[];
}

interface Emoji {
  _id: string;
  symbol: string;
}

export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [availableEmojis, setAvailableEmojis] = useState<Emoji[]>([]);
  const [showPickerFor, setShowPickerFor] = useState<string | null>(null);

  // ----------------------
  // Helpers
  // ----------------------
  const getCreatedById = (post: Post): string | null => {
    // createdBy may be an object { _id } or just an id string.
    const cb = post.createdBy as any;
    if (!cb) return null;
    if (typeof cb === "string") return cb;
    if (cb._id) return String(cb._id);
    return null;
  };

  const normalizeReactions = (reactions: Reaction[] | undefined): Reaction[] =>
    (reactions || []).reduce<Record<string, Set<string>>>((acc, r) => {
      const key = r.emoji;
      if (!acc[key]) acc[key] = new Set();
      (r.users || []).forEach((u) => acc[key].add(String(u)));
      return acc;
    }, {})
      ? Object.entries(
          (reactions || []).reduce<Record<string, Set<string>>>((acc, r) => {
            const key = r.emoji;
            if (!acc[key]) acc[key] = new Set();
            (r.users || []).forEach((u) => acc[key].add(String(u)));
            return acc;
          }, {})
        ).map(([emoji, set]) => ({ emoji, users: Array.from(set) }))
      : [];

  // Replace/merge one updated post into posts array (normalizing reactions)
  // --- In PostPage.tsx ---

  const mergeUpdatedPost = (updated: Post) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p._id !== updated._id) return p;

        const normalizedIncomingReactions =
          normalizeReactions(updated.reactions) || [];
        const currentReactions = p.reactions || [];

        // Create a map of current reactions for quick lookup and modification
        const nextReactionsMap = new Map(
          currentReactions.map((r) => [r.emoji, { ...r }])
        );

        // 🔥 FIX 2: ITERATE OVER INCOMING REACTIONS AND MERGE DEFENSIVELY
        for (const incomingR of normalizedIncomingReactions) {
          const currentR = nextReactionsMap.get(incomingR.emoji);

          const incomingCount = incomingR.users.length;
          const currentCount = currentR?.users.length ?? 0;

          if (incomingCount > currentCount) {
            // If the incoming count is HIGHER, merge the entire reaction object (new users)
            nextReactionsMap.set(incomingR.emoji, incomingR);
          } else if (!currentR) {
            // If the reaction doesn't exist locally, add it.
            nextReactionsMap.set(incomingR.emoji, incomingR);
          }
          // If incomingCount <= currentCount, we skip the merge for this emoji
          // to protect the newer, higher count from another user's action.
        }

        const safelyMergedReactions = Array.from(nextReactionsMap.values());

        // Merge the rest of the post data
        return {
          ...p,
          ...updated, // Aggressive merge for non-reaction fields (content, etc.)
          reactions: safelyMergedReactions, // Use the defensively merged reactions
          createdBy: updated.createdBy || p.createdBy, // Keep createdBy populated
        };
      })
    );
  };
  // ----------------------
  // Fetch initial data
  // ----------------------
  useEffect(() => {
    async function fetchData() {
      try {
        const [postRes, emojiRes] = await Promise.all([
          getPosts(),
          getEmojis(),
        ]);
        // normalize reactions for each post to avoid duplicate emoji entries
        const normalizedPosts: Post[] = (postRes.data || []).map((p: Post) => ({
          ...p,
          reactions: normalizeReactions(p.reactions),
        }));

        setPosts(normalizedPosts);
        setAvailableEmojis(emojiRes.data || []);

        const user = localStorage.getItem("user");
        if (user && user !== "undefined") {
          try {
            console.log("User data from localStorage:", user);
            const parsedUser = JSON.parse(user);
            if (parsedUser?._id) {
              setUserId(parsedUser._id);
              console.log("✅ Logged-in User ID:", parsedUser._id);
            }
          } catch (err) {
            console.error("Invalid JSON in localStorage user:", user);
          }
        }
      } catch (err) {
        console.error("Failed to fetch posts or emojis:", err);
      }
    }
    fetchData();
  }, []);

  // ----------------------
  // Create / Update / Delete
  // ----------------------
  async function handleCreatePost() {
    if (!newContent.trim()) return;
    try {
      const res = await createPost(newContent);
      const norm = {
        ...res.data,
        reactions: normalizeReactions(res.data.reactions),
      };
      setPosts((prev) => [norm, ...prev]);
      setNewContent("");
    } catch (err) {
      console.error("Error creating post:", err);
    }
  }

  async function handleUpdatePost(id: string) {
    if (!editContent.trim()) return;
    try {
      const res = await updatePost(id, editContent);
      mergeUpdatedPost(res.data);
      setEditingPostId(null);
      setEditContent("");
    } catch (err) {
      console.error("Error updating post:", err);
    }
  }

  async function handleDeletePost(id: string) {
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  }

  // ----------------------
  // React / toggle reaction logic (optimistic + reconcile)
  // ----------------------
  const reacting = useRef(new Set<string>()); // prevent spam reactions

  // --- In PostPage.tsx ---

  // --- In PostPage.tsx ---

  // From line 249:
  async function handleReact(postId: string, emoji: string) {
    if (!userId) return; // Must be logged in to react

    const key = `${postId}-${emoji}`;

    if (reacting.current.has(key)) return;
    reacting.current.add(key);

    // 🔥 FIX 1: DETERMINE TOGGLE-OFF STATE BEFORE setPosts
    const currentPost = posts.find((p) => p._id === postId);
    const currentReaction = currentPost?.reactions?.find(
      (r) => r.emoji === emoji
    );
    // If the user's ID is currently in the reaction list, this click is a REMOVE (true).
    const isTogglingOff = currentReaction?.users.map(String).includes(userId);

    // ✅ Optimistic UI update
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p._id !== postId) return p;
        const reactions = (p.reactions || []).map((r) => ({ ...r }));

        const idx = reactions.findIndex((r) => r.emoji === emoji);

        // The toggling logic here is now ONLY for the UI update
        if (idx === -1) {
          // ADD
          reactions.push({ emoji, users: [userId] });
        } else {
          const usersSet = new Set(reactions[idx].users.map(String));
          if (usersSet.has(userId)) {
            usersSet.delete(userId); // REMOVE reaction
          } else {
            usersSet.add(userId); // ADD reaction
          }

          const arr = Array.from(usersSet);
          if (arr.length === 0) {
            reactions.splice(idx, 1); // remove reaction object if empty
          } else {
            reactions[idx].users = arr;
          }
        }

        const normalized = normalizeReactions(reactions);

        // 🔑 Critical Change: Ensure createdBy object is preserved/restored during optimistic update
        const createdByObject =
          typeof p.createdBy === "string"
            ? { _id: p.createdBy, username: MOCK_USERNAME } // Fallback to mock username if only ID exists
            : p.createdBy;

        return {
          ...p,
          reactions: normalized,
          createdBy: createdByObject, // Preserve the rich createdBy object
        };
      })
    );

    // ✅ Server sync
    try {
      const res = await reactToPost(postId, emoji);
      if (res?.data) {
        // 💯 Conditional Merge: Skip merge if we just removed a reaction
        if (!isTogglingOff) {
          mergeUpdatedPost(res.data);
        }
      }
    } catch (err) {
      // In a real app, you would rollback the optimistic change here.
      console.error(
        "Error reacting to post. UI might be temporarily out of sync.",
        err
      );
    } finally {
      reacting.current.delete(key);
      setShowPickerFor(null);
    }
  }
  // ----------------------
  // Start editing
  // ----------------------
  function startEdit(post: Post) {
    setEditingPostId(post._id);
    setEditContent(post.content);
  }

  // ----------------------
  // Render
  // ----------------------
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10">
      <h1 className="text-4xl font-bold mb-6 text-cyan-400">Posts</h1>

      {/* Create */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-8">
        <textarea
          placeholder="Write something..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="w-full md:w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
        />
        <button
          onClick={handleCreatePost}
          className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded-lg transition shrink-0 font-semibold"
        >
          + Post
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => {
          const ownerId = getCreatedById(post);
          return (
            <div
              key={post._id}
              className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700/50 hover:shadow-xl transition relative"
            >
              {editingPostId === post._id ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 bg-slate-700 rounded-lg text-white focus:outline-none border border-slate-600 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdatePost(post._id)}
                      className="bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPostId(null)}
                      className="bg-gray-500 px-3 py-1 rounded-lg hover:bg-gray-600 transition font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg leading-relaxed">{post.content}</p>
                  <small className="block text-gray-400 mt-3 font-mono">
                    By:{" "}
                    {typeof post.createdBy === "string"
                      ? post.createdBy
                      : post.createdBy && (post.createdBy as any).username}
                  </small>
                </>
              )}

              {/* owner controls: compare normalized owner id to logged-in user id */}
              {userId && ownerId && userId === String(ownerId) && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => startEdit(post)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 flex items-center transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 flex items-center transition"
                  >
                    🗑 Delete
                  </button>
                </div>
              )}

              {/* reactions */}
              <div className="mt-4 flex items-center gap-3 flex-wrap relative">
                {post.reactions?.map((r, i) => {
                  const count = r.users?.length ?? 0;
                  if (count === 0) return null; // don't show empty reactions

                  // 🎯 Check if the logged-in user has reacted with this emoji
                  const userHasReacted = r.users?.includes(userId || "");

                  // 🎯 Conditional styling for the active reaction
                  const buttonClass = userHasReacted
                    ? "bg-cyan-600 text-white px-3 py-1 rounded-full hover:bg-cyan-700 transition flex items-center gap-2 shadow-lg ring-2 ring-cyan-500/50" // Active cyan style
                    : "bg-slate-700/50 px-3 py-1 rounded-full hover:bg-slate-700 transition flex items-center gap-2"; // Default dark style

                  return (
                    <button
                      key={`${post._id}-${r.emoji}-${i}`}
                      onClick={() => handleReact(post._id, r.emoji)}
                      className={buttonClass}
                      aria-pressed={userHasReacted}
                      title={`${r.emoji} — ${count}`}
                    >
                      <span>{r.emoji}</span>
                      {/* Count text is white when active (for contrast) and gray when inactive */}
                      <span
                        className={`text-sm font-semibold ${
                          userHasReacted ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {userId ? (
                  <button
                    onClick={() =>
                      setShowPickerFor(
                        showPickerFor === post._id ? null : post._id
                      )
                    }
                    className="bg-slate-700/50 px-3 py-1 rounded-full hover:bg-slate-700 transition font-medium"
                    title="Add reaction"
                  >
                    + 😀
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Login to react</p>
                )}

                {showPickerFor === post._id && (
                  <div className="absolute left-0 top-12 z-10 bg-slate-800 border border-cyan-500/30 p-2 rounded-xl shadow-2xl flex flex-wrap max-w-[260px] transform transition-all duration-300">
                    {availableEmojis.length > 0 ? (
                      availableEmojis.map((e) => {
                        const symbol =
                          e.symbol ||
                          (e as any).emoji ||
                          (e as any).name ||
                          "❓";
                        return (
                          <button
                            key={`${post._id}-${e._id || symbol}`}
                            type="button"
                            onClick={() => handleReact(post._id, symbol)}
                            title={symbol}
                            aria-label={`React with ${symbol}`}
                            className="inline-flex items-center justify-center text-[26px] leading-none m-1 p-1.5 rounded-md transition transform hover:scale-110 focus:scale-110 focus:outline-none"
                          >
                            <span className="inline-block w-10 h-10 rounded-lg flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition">
                              {symbol}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-sm px-2">
                        No emojis available
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
