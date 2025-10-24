import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setMessage("✅ Login successful!");
      navigate("/emoji"); // Redirect to emoji search UI
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null) {
        const e = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const msg = e.response?.data?.message ?? e.message;
        setMessage(msg ?? "❌ Login failed");
      } else {
        setMessage("❌ Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="auth-input"
            required
          />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <p className="auth-footer">
          Don’t have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}
