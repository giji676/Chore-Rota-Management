import React, { useEffect, useState, useRef } from 'react';
import { Pressable, Alert, View, Text, Button, FlatList, StyleSheet, TextInput, Modal } from 'react-native';
import WheelPicker from "react-native-wheel-scrollview-picker";
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';

import api from '../utils/api';
import WeekCalendar from "../components/WeekCalendar";
import CheckBox from "../components/CheckBox";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function HouseDashboardScreen({ navigation, route }) {
    const [house, setHouse] = useState(route.params.house);
    const [error, setError] = useState('');
    const [displayDay, setDisplayDay] = useState([]);
    const [displayDayKey, setDisplayDayKey] = useState('0');
    const [updatedChoresState, setUpdatedChoresState] = useState([]);

    // Modal state
    // Chore
    const [choreModalVisible, setChoreModalVisible] = useState(false);
    const [newChoreName, setNewChoreName] = useState('');
    const [newChoreDescription, setNewChoreDescription] = useState('');
    const [newChoreColor, setNewChoreColor] = useState('#ffffff');

    // Chore Assignment
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState('mon');
    const [selectedHour, setSelectedHour] = useState(12);
    const [selectedMinute, setSelectedMinute] = useState(30);
    const [selectedMember, setSelectedMember] = useState('');

    // Chore Assignment long press
    const [assLongPressModalVisible, setAssLongPressModalVisible] = useState(false);
    const [selectedAss, setSelectedAss] = useState();
    
    const hours = [...Array(24).keys()].map(n => n.toString().padStart(2, "0"));
    const minutes = [...Array(60).keys()].map(n => n.toString().padStart(2, "0"));

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        async function initNotifications() {
            try {
                await configureAndroidChannel();
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    await api.post("accounts/push-token/", { token });
                }
            } catch (error) {
                console.log("error:", error);
            }
        }

        initNotifications();
    }, []);

    useEffect(() => {
        if (!house) return;
        fetchHouse();
    }, []);

    useEffect(() => {
        if (!house?.rota[0]) return;
        setDisplayDay(house.rota[0].week[displayDayKey]);
        setUpdatedChoresState([]);
    }, [displayDayKey]);

    const fetchHouse = async () => {
        const res = await api.get(`house/${house.id}/`);
        setHouse(res.data);
    }

    useEffect(() => {
        if (!house) return;
        setDisplayDay(house.rota[0].week[displayDayKey]);
        setUpdatedChoresState([]);
        // console.log(JSON.stringify(house.rota[0], null, 2));
    }, [house]);

    if (error) return <Text style={styles.error}>{error}</Text>;
    if (!house) return <Text style={styles.error}>House not found</Text>;

    const handleDelete = async () => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this house? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.delete(`house/${house.id}/`);
                            Alert.alert("House deleted successfully");
                            navigation.goBack();
                        } catch (err) {
                            if (err.response && err.response.status !== 204) {
                                Alert.alert(
                                    "Error",
                                    err.response?.data?.error || err.message
                                );
                            } else {
                                Alert.alert("House deleted successfully");
                                navigation.goBack();
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleCheck = (ass) => {
        setUpdatedChoresState(prev => {
            const exists = prev.find(item => item.id === ass.id);

            if (exists) {
                return prev.filter(item => item.id !== ass.id);
            } else {
                return [...prev, { ...ass, completed: !ass.completed }];
            }
        });
    };

    const handleSaveChoreAssignments = async () => {
        await Promise.all(
            updatedChoresState.map(async (ass) => {
                const res = await api.patch(`chores/assignment/${ass.id}/`, { completed: ass.completed });
                return res.data;
            })
        );
        await fetchHouse();
        setUpdatedChoresState([]);
    };

    const handleSaveChoreAssignment = async (ass, state) => {
        await api.patch(`chores/assignment/${ass.id}/`, { completed: state });
        await fetchHouse();

        setUpdatedChores(prev => {
            if (prev.some(item => item.id === ass.id)) {
                return prev.filter(item => item.id !== ass.id);
            }
        });
    };

    const handleCreateChore = async () => {
        if (!newChoreName.trim()) {
            Alert.alert("Error", "Chore name is required");
            return;
        }

        try {
            const res = await api.post("chores/create/", {
                house_id: house.id,
                name: newChoreName,
                description: newChoreDescription,
                color: newChoreColor,
            });
            // setHouse((prev) => ({
            //     ...prev,
            //     chores: [...prev.chores, res.data],
            // }));

            await fetchHouse();
            setChoreModalVisible(false);
            setNewChoreName('');
            setNewChoreDescription('');
            setNewChoreColor('#ffffff');
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const handleAssignChore = async () => {
        if (!selectedDay || selectedHour === null || selectedMinute === null || !selectedMember) {
            Alert.alert("Error", "Please select day, time, and assignee");
            return;
        }

        try {
            await api.post("chores/assign/", {
                // chore_id: selectedChore.id, // replace with your actual selected chore
                chore_id: 91, // replace with your actual selected chore
                rota_id: house?.rota[0].id, // replace with your actual selected chore
                day: selectedDay,
                due_time: `${hours[selectedHour]}:${minutes[selectedMinute]}`,
                person_id: selectedMember,
            });
            await fetchHouse();
            setAssignModalVisible(false);
            // reset
            setSelectedDay('mon');
            setSelectedMember('');
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const onChangeTime = (event, time) => {
        if (time) setSelectedTime(time);
    };

    const deleteChoreAssignment = async (ass) => {
        const res = await api.delete(`chores/assignment/${ass.id}/delete/`);
        await fetchHouse();
    };

    const handleEditAssignment = () => {
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{house.name}</Text>
            <Text style={styles.joinCode}>Join Code: {house.join_code}</Text>

            <Text style={styles.subTitle}>Members:</Text>
            <FlatList
                data={house.members}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Text style={styles.member}>
                        {item.username}{item.is_guest ? ' (Guest)' : ''}
                    </Text>
                )}
            />

            {house?.rota[0] && 
                <WeekCalendar
                    rota={house.rota[0]}
                    onDayPress={(dayKey) => {
                        setDisplayDayKey(dayKey);
                    }}
                />
            }
            {displayDay?.length > 0 && (
                <>
                    <View style={styles.markCompleteContainer}>
                        <Text>Mark Complete</Text>
                    </View>
                    <View>
                        {displayDay?.map((ass) => {
                            const [hh, mm] = ass.due_time?.split(":") ?? ["00","00"];
                            return (
                                <Pressable
                                    key={ass.id}
                                    onLongPress={() => {
                                        setSelectedAss(ass);
                                        setAssLongPressModalVisible(true);
                                    }}
                                    style={styles.choreDetail}
                                >
                                    <Text>{`${hh}:${mm}`} - {ass.chore.name}</Text>
                                    <CheckBox 
                                        onPress={() => handleCheck(ass)} 
                                        checked={ass.completed}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </>
            )}
            <Modal
                visible={assLongPressModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssLongPressModalVisible(false)}
            >
                <View style={styles.assModalBackground}>
                    <View style={styles.assModalContainer}>
                        <View style={styles.assButtonColumn}>
                            <Pressable style={[styles.assModalButton, styles.deleteButton]} onPress={() => {
                                deleteChoreAssignment(selectedAss)
                                setAssLongPressModalVisible(false);
                                setSelectedAss(null);
                            }}>
                                <Text style={styles.assModalButtonText}>Delete</Text>
                            </Pressable>
                            <Pressable style={styles.assModalButton} onPress={handleEditAssignment}>
                                <Text style={styles.assModalButtonText}>Edit</Text>
                            </Pressable>
                            <Pressable style={styles.assModalButton} onPress={() => {
                                handleSaveChoreAssignment(selectedAss, !selectedAss.completed);
                                setAssLongPressModalVisible(false);
                            }}>
                                <Text style={styles.assModalButtonText}>
                                    {selectedAss?.completed ? "Restore" : "Complete"}
                                </Text>
                            </Pressable>
                            <Pressable style={styles.assModalButton} onPress={() => {
                                setAssLongPressModalVisible(false);
                                setSelectedAss(null);
                            }}>
                                <Text style={styles.assModalButtonText}>Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.buttonContainer}>
                <Button onPress={handleSaveChoreAssignments} title="Save Changes"/>
            </View>
            <View style={styles.buttonContainer}>
                <Button onPress={() => setChoreModalVisible(true)} title="Create Chore"/>
            </View>
            <Modal
                visible={choreModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setChoreModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Create New Chore</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Chore Name"
                            placeholderTextColor="gray"
                            value={newChoreName}
                            onChangeText={setNewChoreName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            placeholderTextColor="gray"
                            value={newChoreDescription}
                            onChangeText={setNewChoreDescription}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Color (Hex)"
                            placeholderTextColor="gray"
                            value={newChoreColor}
                            onChangeText={setNewChoreColor}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setChoreModalVisible(false)} />
                            <Button title="Create" onPress={handleCreateChore} />
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.buttonContainer}>
                <Button title="Assign Chore" onPress={() => setAssignModalVisible(true)} />
            </View>
            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Assign Chore</Text>

                        {/* Day Picker */}
                        <Text>Day</Text>
                        <Picker
                            selectedValue={selectedDay}
                            onValueChange={(day) => setSelectedDay(day)}
                            style={styles.picker}
                        >
                            {['mon','tue','wed','thu','fri','sat'].map(day => (
                                <Picker.Item key={day} label={day.toUpperCase()} value={day} />
                            ))}
                        </Picker>

                        {/* Time Picker */}
                        <Text>Time</Text>
                        <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 10 }}>

                            <WheelPicker
                                dataSource={hours}
                                selectedIndex={selectedHour}
                                onValueChange={(index) => setSelectedHour(index)}
                            />

                            <Text style={{ fontSize: 30, marginHorizontal: 10 }}>:</Text>

                            <WheelPicker
                                dataSource={minutes}
                                selectedIndex={selectedMinute}
                                onValueChange={(index) => setSelectedMinute(index)}
                            />

                        </View>

                        {/* Assignee Picker */}
                        <Text>Assign to</Text>
                        <Picker
                            selectedValue={selectedMember}
                            onValueChange={(memberId) => setSelectedMember(memberId)}
                            style={styles.picker}
                        >
                            {house?.members?.map(member => (
                                <Picker.Item
                                    key={member.id}
                                    label={member.username + (member.is_guest ? ' (Guest)' : '')}
                                    value={member.id}
                                />
                            ))}
                        </Picker>

                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setAssignModalVisible(false)} />
                            <Button title="Assign" onPress={handleAssignChore} />
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.buttonContainer}>
                <Button
                    title="Delete House"
                    color="red"
                    onPress={handleDelete}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    joinCode: { fontSize: 16, marginBottom: 20 },
    subTitle: { fontSize: 18, marginBottom: 10 },
    member: { fontSize: 16, marginBottom: 5 },
    buttonContainer: { marginTop: 20 },
    error: { color: 'red', textAlign: 'center', marginTop: 20 },
    choreDetail: {
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    markCompleteContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5 
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 16,
    },
    assModalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    assModalContainer: {
        borderRadius: 10,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },
    assButtonColumn: { },
    assModalButton: {
        padding: 8,
        paddingHorizontal: 16,
        backgroundColor: '#eee',
    },
    assModalButtonText: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    picker: {
        color: '#444',
        marginBottom: 10,
        backgroundColor: '#eee',
        fontWeight: 'bold',
    },
});
