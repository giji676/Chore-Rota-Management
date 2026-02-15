import axios from "axios";

export const authApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});
