import React, { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";

import { authApi } from "./authApi";
import api from "../utils/api";
import {
    setTokens,
    getTokens,
    clearTokens,
    getDeviceId,
    setDeviceId,
} from "./authStorage";

export const AuthContext = createContext();

const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    } catch {
        return true;
    }
};

export const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(null);
    const [authType, setAuthType] = useState(null); // guest | registered
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // -----------------------
    // FETCH USER
    // -----------------------
    const fetchUser = async () => {
        try {
            const res = await api.get("accounts/user/");
            setUser(res.data);
        } catch (err) {
            console.error("Failed to fetch user:", err);
            setUser(null);
        }
    };

    // -----------------------
    // LOGIN (REGISTERED)
    // -----------------------
    const login = async (email, password) => {
        const res = await authApi.post("accounts/login/", { email, password });

        const { access_token, refresh_token } = res.data;

        await setTokens(access_token, refresh_token, "registered");

        setAccessToken(access_token);
        setAuthType("registered");
        await fetchUser();
    };

    // -----------------------
    // GUEST LOGIN
    // -----------------------
    const guestLogin = async (firstName, lastName) => {
        let device_id = await getDeviceId();

        if (!device_id) {
            device_id = uuidv4();
            await setDeviceId(device_id);
        }

        const res = await authApi.post("accounts/guest/", {
            device_id,
            first_name: firstName,
            last_name: lastName,
        });

        const { access_token, refresh_token } = res.data;

        await setTokens(access_token, refresh_token, "guest");

        setAccessToken(access_token);
        setAuthType("guest");
        await fetchUser();
    };

    // -----------------------
    // REFRESH
    // -----------------------
    const refreshAccessToken = async (refreshToken, type) => {
        try {
            const res = await authApi.post("accounts/refresh/", {
                refresh_token: refreshToken,
            });

            const { access_token, refresh_token } = res.data;

            await setTokens(access_token, refresh_token, type);

            setAccessToken(access_token);
            return access_token;
        } catch {
            if (type === "guest") {
                return attemptGuestRestore();
            }
            await logout();
            return null;
        }
    };

    // -----------------------
    // RESTORE GUEST
    // -----------------------
    const attemptGuestRestore = async () => {
        const device_id = await getDeviceId();
        if (!device_id) return null;

        try {
            const res = await authApi.post("accounts/guest/", { device_id });
            const { access_token, refresh_token } = res.data;

            await setTokens(access_token, refresh_token, "guest");
            setAccessToken(access_token);
            setAuthType("guest");
            return access_token;
        } catch {
            await logout();
            return null;
        }
    };

    // -----------------------
    // LOGOUT
    // -----------------------
    const logout = async () => {
        await clearTokens();
        setAccessToken(null);
        setAuthType(null);
        setUser(null);
    };

    // -----------------------
    // APP BOOT
    // -----------------------
    useEffect(() => {
        const initialize = async () => {
            const { access, refresh, type } = await getTokens();

            if (!access || !refresh || !type) {
                setLoading(false);
                return;
            }

            if (!isTokenExpired(access)) {
                setAccessToken(access);
                setAuthType(type);
            } else if (isTokenExpired(refresh)) {
                await refreshAccessToken(refresh, type);
            } else if (type === "guest") {
                await attemptGuestRestore();
            }
            await fetchUser();

            setLoading(false);
        };

        initialize();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                authType,
                user,
                loading,
                login,
                guestLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
