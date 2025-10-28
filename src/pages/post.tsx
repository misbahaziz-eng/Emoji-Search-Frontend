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
  createdBy?: { _id?: string } | string | null;
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
  const mergeUpdatedPost = (updated: Post) => {
    const normalized: Post = {
      ...updated,
      reactions: normalizeReactions(updated.reactions),
    };
    setPosts((prev) =>
      prev.map((p) => (p._id === normalized._id ? normalized : p))
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

  async function handleReact(postId: string, emoji: string) {
    if (!userId) {
      console.warn("User not logged in - can't react");
      return;
    }

    const key = `${postId}-${emoji}`;
    if (reacting.current.has(key)) return; // prevent rapid double clicks
    reacting.current.add(key);

    // ✅ Optimistic UI update
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p._id !== postId) return p;
        const reactions = (p.reactions || []).map((r) => ({ ...r }));

        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          // add new reaction
          reactions.push({ emoji, users: [userId] });
        } else {
          const usersSet = new Set(reactions[idx].users.map(String));
          if (usersSet.has(userId)) {
            usersSet.delete(userId); // toggle off
          } else {
            usersSet.add(userId); // toggle on
          }
          const arr = Array.from(usersSet);
          if (arr.length === 0) {
            reactions.splice(idx, 1);
          } else {
            reactions[idx].users = arr;
          }
        }

        const normalized = normalizeReactions(reactions);
        return { ...p, reactions: normalized };
      })
    );

    // ✅ Server sync
    try {
      const res = await reactToPost(postId, emoji);
      if (res?.data) {
        mergeUpdatedPost(res.data); // safe merge (prevents count drop)
      }
    } catch (err) {
      console.error("Error reacting to post:", err);
      try {
        const fresh = await getPosts();
        const normalizedPosts: Post[] = (fresh.data || []).map((p: Post) => ({
          ...p,
          reactions: normalizeReactions(p.reactions),
        }));
        setPosts(normalizedPosts);
      } catch (e) {
        console.error("Failed to reload posts after react error:", e);
      }
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
    <div className="min-h-screen bg-[#0a0f1f] text-white p-10">
      <h1 className="text-4xl font-bold mb-6">Posts</h1>

      {/* Create */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-8">
        <textarea
          placeholder="Write something..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="w-full md:w-2/3 p-3 bg-[#1a1f2f] rounded-lg text-white focus:outline-none resize-none"
        />
        <button
          onClick={handleCreatePost}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
        >
          Create New Post
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => {
          const ownerId = getCreatedById(post);
          return (
            <div
              key={post._id}
              className="bg-[#1a1f2f] p-5 rounded-xl shadow-md hover:shadow-lg transition relative"
            >
              {editingPostId === post._id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 bg-[#2a2f3f] rounded-lg text-white focus:outline-none"
                  />
                  <button
                    onClick={() => handleUpdatePost(post._id)}
                    className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-lg">{post.content}</p>
                  <small className="block text-gray-400 mt-2">
                    By:{" "}
                    {typeof post.createdBy === "string"
                      ? post.createdBy
                      : post.createdBy && (post.createdBy as any).username}
                  </small>
                </>
              )}

              {/* owner controls: compare normalized owner id to logged-in user id */}
              {userId && ownerId && userId === String(ownerId) && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => startEdit(post)}
                    className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 flex items-center"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 flex items-center"
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
                  return (
                    <button
                      key={`${post._id}-${r.emoji}-${i}`}
                      onClick={() => handleReact(post._id, r.emoji)}
                      className="bg-[#2a2f3f] px-3 py-1 rounded-full hover:bg-[#3a3f4f] transition flex items-center gap-2"
                      aria-pressed={r.users?.includes(userId || "")}
                      title={`${r.emoji} — ${count}`}
                    >
                      <span>{r.emoji}</span>
                      <span className="text-sm text-gray-400">{count}</span>
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
                    className="bg-[#2a2f3f] px-3 py-1 rounded-full hover:bg-[#3a3f4f] transition"
                    title="Add reaction"
                  >
                    + 😀
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Login to react</p>
                )}

                {showPickerFor === post._id && (
                  <div className="absolute left-0 top-10 z-10 bg-[#1a1f2f] p-2 rounded-xl shadow-lg flex flex-wrap max-w-[260px]">
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
                            <span className="inline-block w-10 h-10 rounded-md flex items-center justify-center bg-[#2a2f3f] text-white">
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
