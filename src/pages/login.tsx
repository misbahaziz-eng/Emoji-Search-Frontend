import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";

// Shadcn UI components
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
      navigate("/emoji");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <Card className="w-full max-w-md p-6 shadow-xl border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-50 text-gray-900 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold text-amber-800">
            Login
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-900 font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white border border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-amber-900 font-semibold"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-white border border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-amber-800">{message}</p>
          )}
        </CardContent>

        <CardFooter className="text-center text-sm text-amber-900">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="text-amber-700 hover:underline ml-1 font-semibold"
          >
            Register
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
