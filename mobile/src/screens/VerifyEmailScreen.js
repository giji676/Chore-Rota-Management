import { View, Alert } from "react-native";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

import api from "../utils/api";

export default function VerifyEmailScreen({ route, navigation }) {
    const { email } = route.params;
    if (!email) return;

    const resendEmail = async () => {
        try {
            const res = await api.post("accounts/resend-verification/", {email});
            if (res.status === 200) {
                Alert.alert(
                    "Verification Email Sent",
                    "A new verification email has been sent to your inbox. Please check your email to verify your account before logging in.",
                );
            }
        } catch (err) {
            // console.log("Failed to resend verification email. Please try again later.");
            console.log(err.response.data);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
            <AppText 
                variant="title"
                style={{
                    fontSize: 32,
                    textAlign: "center",
                    fontWeight: "bold",
                }}
            >
                It looks like you haven't verified your email address yet
            </AppText>

            <AppText style={{
                marginTop: 12,
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
                variant="primary"
                onPress={resendEmail}
            />

            <AppButton
                title="Change Email"
                variant="secondary"
                onPress={() => navigation.goBack()}
            />

            <AppButton
                title="Close"
                variant="secondary"
                style={{ marginTop: 24 }}
                onPress={() => navigation.goBack()}
            />
        </View>
    );
}
