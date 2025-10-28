/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await registerUser(form);
      console.log("📩 Backend response:", res.data);
      setMessage("✅ Registration successful!");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err: any) {
      console.error("❌ Registration failed:", err);
      setMessage(err.response?.data?.message || "❌ Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <Card className="w-full max-w-md p-6 shadow-2xl bg-slate-800/80 backdrop-blur-sm border border-indigo-700/50 text-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold text-cyan-400">
            Register
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 font-semibold">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="JohnDoe"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white focus:border-cyan-500 focus:ring-cyan-500 transition"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white focus:border-cyan-500 focus:ring-cyan-500 transition"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-slate-700 border border-slate-600 text-white focus:border-cyan-500 focus:ring-cyan-500 transition"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white transition-all"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-cyan-400">{message}</p>
          )}
        </CardContent>

        <CardFooter className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-cyan-500 font-semibold hover:underline ml-1"
          >
            Login
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
