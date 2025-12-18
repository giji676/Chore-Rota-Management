import React, { useState, useEffect } from "react";
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
    repeatDelta,
    setRepeatDelta,
}) {
    const repeatDeltaPresets = {
        "Don't repeat": {},
        "Every day": {"days": 1},
        "Every week": {"days": 7},
        "Every 2 weeks": {"days": 14},
        "Every month": {"months": 1},
        Custom: "custom",
    };
    const [repeatDeltaLabel, setRepeatDeltaLabel] = useState("Every week");
    const [customNum, setCustomNum] = useState("1");
    const [customUnit, setCustomUnit] = useState("day");

    const onChangePicker = (label) => {
        setRepeatDeltaLabel(label);
        if (label === "Custom") {
            setRepeatDelta(getRepeatValue("1", "day"));
        } else {
            setRepeatDelta(repeatDeltaPresets[label]);
        }
    };

    const getRepeatValue = (num = customNum, unit = customUnit) => {
        const n = parseInt(num, 10);
        if (unit === "day") return { days: n };
        if (unit === "week") return { days: 7 * n };
        if (unit === "month") return { months: n };
        return {};
    };

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
                                label={member.label}
                                value={member.id}
                            />
                        ))}
                    </Picker>

                    <View>
                        <Picker selectedValue={repeatDeltaLabel} onValueChange={onChangePicker}>
                            {Object.keys(repeatDeltaPresets).map((label) => (
                                <Picker.Item key={label} label={label} value={label} />
                            ))}
                        </Picker>

                        {repeatDeltaLabel === "Custom" && (
                            <View style={styles.customContainer}>
                                <Text>Every</Text>
                                <TextInput
                                    style={styles.inputCustomNum}
                                    keyboardType="numeric"
                                    value={customNum}
                                    onChangeText={(text) => {
                                        setCustomNum(text);
                                        setRepeatDelta(getRepeatValue(text, customUnit));
                                    }}
                                />

                                <Picker
                                    selectedValue={customUnit}
                                    onValueChange={(unit) => {
                                        setCustomUnit(unit);
                                        setRepeatDelta(getRepeatValue(customNum, unit));
                                    }}
                                    style={styles.unitPicker}
                                >
                                    <Picker.Item label="day" value="day" />
                                    <Picker.Item label="week" value="week" />
                                    <Picker.Item label="month" value="month" />
                                </Picker>
                            </View>
                        )}
                    </View>

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
        width: "85%",
        maxWidth: 400,
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        flexShrink: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
    },
    picker: {
        color: "#444",
        backgroundColor: "#eee",
        fontWeight: "bold",
        marginVertical: 10,
        borderRadius: 8,
    },
    customContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingHorizontal: 10,
        backgroundColor: "#f0f0f0",
    },
    inputCustomNum: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        width: 60,
        marginHorizontal: 10,
        fontSize: 16,
        textAlign: "center",
    },
    unitPicker: {
        flex: 1,
    },
});
