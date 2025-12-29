import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import { dumpAsyncStorage } from "../utils/asyncDump";

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [error, setError] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    const [guestModalVisible, setGuestModalVisible] = useState(false);
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");

    const getErrorMessage = (err) => {
        if (!err.response) return "Network error. Please try again.";

        const data = err.response.data;

        if (typeof data === "string") return data;
        if (data.error) return data.error;

        // DRF serializer errors
        if (typeof data === "object") {
            return Object.values(data).flat().join("\n");
        }

        return "Something went wrong. Please try again.";
    };

    const handleLogin = async () => {
        setError("");

        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            const res = await api.post("accounts/login/", { email, password });
            await AsyncStorage.setItem("access_token", res.data.access_token);
            await AsyncStorage.setItem("refresh_token", res.data.refresh_token);
            await AsyncStorage.setItem("last_login", "registered");
            navigation.replace("HouseAccess");
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleRegister = async () => {
        setError("");

        if (!email || !password || !firstName || !lastName) {
            setError("All fields are required");
            return;
        }

        try {
            const res = await api.post("accounts/register/", {
                email,
                password,
                first_name: firstName,
                last_name: lastName,
            });

            await AsyncStorage.setItem("access_token", res.data.access_token);
            await AsyncStorage.setItem("refresh_token", res.data.refresh_token);
            await AsyncStorage.setItem("last_login", "registered");
            navigation.replace("HouseAccess");
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleGuest = async (firstName, lastName) => {
        setError("");

        let device_id = await AsyncStorage.getItem("device_id");
        if (!device_id) {
            device_id = uuidv4();
            await AsyncStorage.setItem("device_id", device_id);
        }

        try {
            const res = await api.post("accounts/guest/", {
                device_id,
                first_name: firstName,
                last_name: lastName,
            });

            await AsyncStorage.setItem("access_token", res.data.access_token);
            await AsyncStorage.setItem("refresh_token", res.data.refresh_token);
            await AsyncStorage.setItem("last_login", "guest");

            setGuestModalVisible(false);
            navigation.replace("HouseAccess");
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isRegistering ? "Create Account" : "Login"}</Text>

            {(isRegistering) && (
                <>
                    <TextInput
                        placeholder="First name"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Last name"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.input}
                    />
                </>
            )}

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />

            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />

            <Button
                title={isRegistering ? "Register" : "Login"}
                onPress={isRegistering ? handleRegister : handleLogin}
            />

            <TouchableOpacity
                onPress={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                }}
                style={{ marginTop: 15 }}
            >
                <Text style={styles.toggleText}>
                    {isRegistering
                        ? "Already have an account? Login"
                        : "Don't have an account? Register"}
                </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Button
                title="Continue as Guest"
                onPress={() => setGuestModalVisible(true)}
                color="#777"
            />

            <Modal
                visible={guestModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Continue as Guest</Text>

                        <TextInput
                            placeholder="First name"
                            value={guestFirstName}
                            onChangeText={setGuestFirstName}
                            style={styles.input}
                        />

                        <TextInput
                            placeholder="Last name"
                            value={guestLastName}
                            onChangeText={setGuestLastName}
                            style={styles.input}
                        />

                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                onPress={() => setGuestModalVisible(false)}
                            />
                            <Button
                                title="Continue"
                                onPress={() => handleGuest(guestFirstName, guestLastName)}
                                disabled={!guestFirstName || !guestLastName}
                            />
                        </View>
                    </View>
                </View>
            </Modal>


            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 16,
    },
    toggleText: {
        color: "#007bff",
        textAlign: "center",
        fontSize: 14,
    },
    divider: {
        marginVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    error: {
        marginTop: 15,
        color: "#d32f2f",
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalCard: {
        backgroundColor: "#fff",
        padding: 20,
        width: "85%",
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
    },
});
