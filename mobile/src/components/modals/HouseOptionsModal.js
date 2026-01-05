import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";

export default function HouseOptionsModal({
    visible,
    house,
    onClose,
    onEdit,
    onDelete,
}) {
    if (!house) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>
                        {house.name}
                    </Text>

                    <TouchableOpacity
                        style={styles.action}
                        onPress={() => {
                            onEdit(house);
                            onClose();
                        }}
                    >
                        <Text>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.action}
                        onPress={() => {
                            onDelete(house);
                            onClose();
                        }}
                    >
                        <Text style={styles.delete}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.cancel}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "80%",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    action: {
        paddingVertical: 10,
    },
    delete: {
        color: "red",
    },
    cancel: {
        marginTop: 10,
        textAlign: "center",
        color: "#555",
    },
});
