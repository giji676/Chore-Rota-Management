import React, { useState, useEffect } from "react";
import { 
    Pressable,
    Modal,
    View,
    Button,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import Auth from "../utils/auth";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import { dumpAsyncStorage } from "../utils/asyncDump";
import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

// TODO: !!! check correct api caller is used for login/guest/register (api, authApi)
// TODO: Make email case insensitive
// TODO: Password field starts with upper case by defualt, change that to lower-default
// TODO: Add resend verification email functionality

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [error, setError] = useState("");
    const [messageModalVisible, setMessageModalVisible] = useState(false);
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
            const res = await Auth.authApi.post("accounts/login/", { email, password });
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
            // TODO: use Auth.authApi here?????
            await api.post("accounts/register/", {
                email,
                password,
                first_name: firstName,
                last_name: lastName,
            });

            // clear any stored tokens
            await AsyncStorage.removeItem("access_token");
            await AsyncStorage.removeItem("refresh_token");

            // show modal feedback
            setMessageModalVisible(true);

        } catch (err) {
            const message = getErrorMessage(err);
            if (message.includes("user with this email already exists")) {
                setError(
                    "An account with this email already exists. Did you verify your email?"
                );
            } else {
                setError(message);
            }
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
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <AppText style={styles.title}>{isRegistering ? "Create Account" : "Login"}</AppText>

                {(isRegistering) && (
                    <>
                        <AppTextInput
                            placeholder="First name"
                            value={firstName}
                            onChangeText={setFirstName}
                            style={styles.input}
                        />
                        <AppTextInput
                            placeholder="Last name"
                            value={lastName}
                            onChangeText={setLastName}
                            style={styles.input}
                        />
                    </>
                )}

                <AppTextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    placeholderTextColor={colors.textSecondary}
                />

                <AppTextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />

                <AppButton
                    title={isRegistering ? "Register" : "Login"}
                    onPress={isRegistering ? handleRegister : handleLogin}
                    loading={false}
                />

                <TouchableOpacity
                    onPress={() => {
                        setIsRegistering(!isRegistering);
                        setError("");
                    }}
                    style={{ marginTop: 4 }}
                >
                    <AppText style={styles.toggleText}>
                        {isRegistering
                            ? "Already have an account? Login"
                            : "Don't have an account? Register"}
                    </AppText>
                </TouchableOpacity>

                <View style={styles.divider} />

                <AppButton
                    title="Continue as Guest"
                    variant="secondary"
                    onPress={() => setGuestModalVisible(true)}
                />

                <Modal
                    visible={messageModalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setMessageModalVisible(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            <AppText style={styles.modalTitle}>Registration Successful!</AppText>
                            <AppText style={styles.modalText}>
                                Please check your email to verify your account before logging in.
                            </AppText>
                            <AppButton
                                title="Go to Login"
                                onPress={() => {
                                    setMessageModalVisible(false);
                                    setIsRegistering(!isRegistering);
                                    setError("");
                                }}
                            />
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={guestModalVisible}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            <AppText style={styles.modalTitle}>Continue as Guest</AppText>

                            <AppTextInput
                                placeholder="First name"
                                value={guestFirstName}
                                onChangeText={setGuestFirstName}
                                style={styles.input}
                            />

                            <AppTextInput
                                placeholder="Last name"
                                value={guestLastName}
                                onChangeText={setGuestLastName}
                                style={styles.input}
                            />
                            <View style={{ gap: 10 }}>
                                <AppButton
                                    title="Cancel"
                                    variant="secondary"
                                    onPress={() => setGuestModalVisible(false)}
                                />
                                <AppButton
                                    title="Continue"
                                    onPress={() => handleGuest(guestFirstName, guestLastName)}
                                    disabled={!guestFirstName || !guestLastName}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>


                {error ? <AppText style={styles.error}>{error}</AppText> : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: spacing.lg,
        backgroundColor: colors.background,
        gap: spacing.md,
    },
    title: {
        ...typography.h2,
        textAlign: "center",
        color: colors.textPrimary,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.sm,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    toggleText: {
        color: colors.primary,
        textAlign: "center",
        ...typography.small,
    },
    error: {
        marginTop: spacing.xs,
        color: colors.error,
        textAlign: "center",
        ...typography.small,
        lineHeight: 20,
    },
    success: {
        marginTop: spacing.sm,
        color: colors.success || "#4caf50",
        textAlign: "center",
        ...typography.small,
        lineHeight: 20,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.sm,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        width: "85%",
        borderRadius: spacing.md,
        gap: spacing.md,
    },
    modalTitle: {
        ...typography.h2,
        marginBottom: spacing.sm,
        textAlign: "center",
        color: colors.textPrimary,
    },
    modalText: {
        ...typography.body,
        marginBottom: spacing.lg,
        textAlign: "center",
        color: colors.textSecondary,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: spacing.sm,
        alignItems: "center",
    },
    buttonText: {
        color: colors.background,
        fontWeight: "600",
        fontSize: typography.body.fontSize,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        borderRadius: spacing.sm,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: colors.textSecondary,
        fontWeight: "500",
        fontSize: typography.body.fontSize,
    },
});
