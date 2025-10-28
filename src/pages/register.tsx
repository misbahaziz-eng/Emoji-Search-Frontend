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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <Card className="w-full max-w-md p-6 shadow-lg border border-amber-300 bg-amber-100 text-brown-900 rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold text-amber-800">
            Register
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-amber-800">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="JohnDoe"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-800">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-800">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white transition-all"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-amber-800">{message}</p>
          )}
        </CardContent>

        <CardFooter className="text-center text-sm text-amber-700">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-amber-900 font-semibold hover:underline ml-1"
          >
            Login
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
