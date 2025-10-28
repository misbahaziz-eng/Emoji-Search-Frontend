import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export const getEmojis = async () => {
  const response = await API.get("/emoji");
  console.log("Emojis data ====>", response.data);
  return response;
};

export const getFavorites = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await API.get("/favorites");
    console.log("Favorites data for authenticated user:", response.data);
    return response;
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    throw error;
  }
};
export const toggleFavorite = async (slug: string) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await API.post("/favorites/toggle", { slug });
    console.log("Toggle favorite response:", response.data);
    return response;
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await API.post("/auth/logout");
    localStorage.removeItem("token"); // Clear the token from localStorage
    return response;
  } catch (error) {
    console.error("Failed to logout:", error);
    throw error;
  }
};

export const getPosts = () => API.get("/posts");
export const createPost = (content: string) => API.post("/posts", { content });
export const updatePost = (id: string, content: string) =>
  API.put(`/posts/${id}`, { content });
export const deletePost = (id: string) => API.delete(`/posts/${id}`);
export const reactToPost = (id: string, emoji: string) =>
  API.post(`/posts/${id}/react`, { emoji });
