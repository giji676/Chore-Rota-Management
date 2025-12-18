import React from "react";
import { View, Text, Modal, TextInput, Button, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function CreateChoreModal({
    visible,
    onClose,
    onCreate,
    choreName,
    members,
    setChoreName,
    choreDescription,
    setChoreDescription,
    choreColor,
    setChoreColor,
    selectedMember,
    setSelectedMember,
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>Create New Chore</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Chore Name"
                        placeholderTextColor="gray"
                        value={choreName}
                        onChangeText={setChoreName}
                    />

                    <TextInput
                        style={[styles.input, styles.multiline]}
                        placeholder="Description"
                        placeholderTextColor="gray"
                        value={choreDescription}
                        onChangeText={setChoreDescription}
                        multiline
                        textAlignVertical="top"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Color (Hex)"
                        placeholderTextColor="gray"
                        value={choreColor}
                        onChangeText={setChoreColor}
                    />

                    <Text>Assign to</Text>
                    <Picker
                        selectedValue={selectedMember}
                        onValueChange={setSelectedMember}
                        style={styles.picker}
                    >
                        {members.map((member) => (
                            <Picker.Item
                                key={member.id}
                                label={
                                    member.username +
                                        (member.is_guest ? " (Guest)" : "")
                                }
                                value={member.id}
                            />
                        ))}
                    </Picker>

                    <View style={styles.buttons}>
                        <Button title="Cancel" onPress={onClose} />
                        <Button title="Create" onPress={onCreate} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "80%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        marginBottom: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    picker: {
        color: "#444",
        backgroundColor: "#eee",
        fontWeight: "bold",
        marginVertical: 5,
    },
});
