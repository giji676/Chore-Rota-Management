import { View, Alert } from "react-native";
import { useState } from "react";

import ChangeEmailScreen from "./ChangeEmailScreen";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";
import BottomSheet from "../components/BottomSheet";

import api from "../utils/api";
import { spacing, colors, typography } from "../theme";

export default function VerifyEmailScreen({ route, navigation }) {
    const { email } = route.params;
    if (!email) return;

    const [showAlert, setShowAlert] = useState(false);
    const [loading, setLoading] = useState(false);

    const resendEmail = async () => {
        try {
            setLoading(true);
            const res = await api.post("accounts/resend-verification/", { email });
            if (res.status === 200) {
                setShowAlert(true);
            }
        } catch (err) {
            console.log("Failed to resend verification email:", err.response.data);
        } finally {
            setLoading(false);
        }
    };

    const AlertContent = () => {
        return (
            <View style={{
                justifyContent: "center",
                alignItems: "center",
                padding: spacing.lg,
                gap: spacing.md,
            }}>
                <AppText style={{ ...typography.h1, }}>
                    Verification Email Sent
                </AppText>
                <AppText style={{
                    ...typography.body,
                    textAlign: "center",
                    marginBottom: spacing.md
                }}>
                    A new verification email has been sent to your inbox.
                    Please check your email to verify your account before logging in.
                </AppText>
                <AppButton
                    title="Dismiss"
                    variant="primary"
                    onPress={() => {
                        setShowAlert(false);
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Profile" }],
                        });
                    }}
                />
            </View>
        );
    };

    return (
        <>
            <BottomSheet
                visible={showAlert}
                onDismiss={() => setShowAlert(false)}
            >
                <AlertContent />
            </BottomSheet>

            <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 10 }}>
                <AppText 
                    variant="title"
                    style={{
                        ...typography.h1,
                        textAlign: "center",
                    }}
                >
                    It looks like you haven't verified your email address yet
                </AppText>

                <AppText style={{
                    // marginTop: 12,
                    textAlign: "center",
                }}>
                    Would you like to verify {
                        <AppText style={{ fontWeight: "bold", marginTop: 4 }}>
                            {email}
                        </AppText>
                    } now?
                </AppText>

                <AppButton
                    title="Verify Now"
                    disabled={loading}
                    variant="primary"
                    onPress={resendEmail}
                />

                <AppButton
                    title="Change Email"
                    variant="secondary"
                    onPress={() => navigation.navigate("ChangeEmail", { email })}
                />

                <AppButton
                    title="Close"
                    variant="secondary"
                    onPress={() => 
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "Profile" }],
                        })
                    }
                />
            </View>
        </>
    );
}
