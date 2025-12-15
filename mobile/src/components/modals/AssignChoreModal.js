import React from "react";
import { View, Text, Modal, Button, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function AssignChoreModal({
    visible,
    onClose,
    onAssign,
    chores,
    members,
    selectedChore,
    setSelectedChore,
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
                    <Text style={styles.title}>Assign Chore</Text>

                    <Text>Chore</Text>
                    <Picker
                        selectedValue={selectedChore}
                        onValueChange={setSelectedChore}
                        style={styles.picker}
                    >
                        {chores.map((chore) => (
                            <Picker.Item
                                key={chore.id}
                                label={chore.name}
                                value={chore.id}
                            />
                        ))}
                    </Picker>

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
                        <Button title="Assign" onPress={onAssign} />
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
