import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const registerUser = (data: RegisterData) =>
  API.post("/auth/register", data);
export const loginUser = (data: LoginData) => API.post("/auth/login", data);
export const getEmojis = () => API.get("/emoji");
console.log("Emojis ====>", getEmojis);
export const getFavorites = () => API.get("/favorites");
console.log("Favorites ====>", getFavorites);
export const toggleFavorite = (slug: string) =>
  API.post(
    "/favorites/toggle",
    { slug },
    { headers: { "Content-Type": "application/json" } }
  );
