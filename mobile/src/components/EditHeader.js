import {
    View,
    Pressable,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { colors, spacing } from "../theme";


export default function EditHeader({ navigation, route, options, back, onSave }) {
    const insets = useSafeAreaInsets();
    const ICON_SIZE = 32;
    return (
        <View style={styles.container}>
            <View style={{ height: insets.top }}/>
            <View style={styles.header}>
                {back && (
                    <Pressable 
                        style={styles.edit}
                        onPress={navigation.goBack}
                    >
                        <MaterialIcons
                            name="keyboard-arrow-left"
                            size={ICON_SIZE}
                            color={colors.txtPrimary}
                        />
                    </Pressable>
                )}

                <Pressable 
                    style={styles.edit}
                    onPress={onSave}
                >
                    <MaterialIcons
                        name="check"
                        size={ICON_SIZE}
                        color={colors.txtPrimary}
                    />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
    },
    header: {
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        padding: spacing.md,
    },
    edit: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        aspectRatio: 1,
        padding: spacing.xs,
    },
});
