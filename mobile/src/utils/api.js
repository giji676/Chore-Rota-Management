import axios from "axios";
import { getTokens } from "../auth/authStorage";

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
    const { access } = await getTokens();
    if (access) {
        config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
});

export default api;
