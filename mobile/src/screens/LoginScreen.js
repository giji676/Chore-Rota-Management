import { useState } from "react";
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
    Alert,
} from "react-native";
import { useAuth } from "../auth/useAuth";
import api from "../utils/api";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

// TODO: Password field starts with upper case by defualt, change that to lower-default
// TODO: Add cooldown to resend

export default function LoginScreen({ navigation }) {
    const { login, guestLogin } = useAuth();

    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showVerifyButton, setShowVerifyButton] = useState(false);

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

        setLoading(true);
        try {
            await login(email.toLowerCase(), password);
            // DO NOT navigate
            // AuthProvider state change will re-render navigator
        } catch (err) {
            const message = getErrorMessage(err);

            if (message.includes("verify your email")) {
                setShowVerifyButton(true);
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };


    const handleRegister = async () => {
        setError("");

        if (!email || !password || !firstName || !lastName) {
            setError("All fields are required");
            return;
        }

        setLoading(true);
        try {
            await api.post("accounts/register/", {
                email: email.toLowerCase(),
                password,
                first_name: firstName,
                last_name: lastName,
            });

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
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setError("");

        try {
            await guestLogin(guestFirstName, guestLastName);
            setGuestModalVisible(false);
            // DO NOT navigate
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleEmailVerificationResend = async () => {
        const res = await api.post("accounts/resend-verification/", {email});
        if (res.status === 200) {
            Alert.alert(
                "Verification Email Sent",
                "A new verification email has been sent to your inbox. Please check your email to verify your account before logging in.",
            )
        } else {
            setError("Failed to resend verification email. Please try again later.");
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
                    loading={loading}
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
                            {/* <View style={{ width: "100%", justifyContent: "flex-end" }}> */}
                            {/*     <AppButton */}
                            {/*         title="Close" */}
                            {/*     /> */}
                            {/* </View> */}
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
                {showVerifyButton && (
                    <AppButton
                        title="Resend Verification Email"
                        variant="secondary"
                        onPress={handleEmailVerificationResend}
                    />
                )}
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
