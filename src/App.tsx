// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import EmojiSearchPage from "./pages/emojiSearchPage"; // renamed from EmojiApp for clarity
import type { JSX } from "react";
import PostPage from "./pages/post";
import { Toaster } from "sonner";

// 🔒 ProtectedRoute — ensures only logged-in users can access emoji search page
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) {
    // Redirect to login if token is missing
    window.location.href = "/login";
    return null;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔑 Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Protected emoji search page */}
        <Route
          path="/emoji"
          element={
            <ProtectedRoute>
              <EmojiSearchPage />
            </ProtectedRoute>
          }
        />

        {/* 🚀 Default route: redirect to login */}
        <Route path="*" element={<Login />} />
        <Route path="/post" element={<PostPage />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
