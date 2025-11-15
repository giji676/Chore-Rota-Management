import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [placeId, setPlaceId] = useState('');
    const [password, setPassword] = useState('');
    const [maxMembers, setMaxMembers] = useState('6'); // default 6
    const [response, setResponse] = useState('');

    const handleSubmit = async () => {
        const data = {
            name,
            address,
            place_id: placeId,
            password,
            max_members: parseInt(maxMembers) || 6,
        };

        try {
            const res = await fetch('http://192.168.0.134:8000/api/house/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const json = await res.json();
            setResponse(JSON.stringify(json, null, 2)); // display response nicely
        } catch (error) {
            setResponse('Error: ' + error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create Entry</Text>

            <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
            />

            <TextInput
                style={styles.input}
                placeholder="Place ID"
                value={placeId}
                onChangeText={setPlaceId}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Max Members (default 6)"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="numeric"
            />

            <Button title="Submit" onPress={handleSubmit} />

            <Text style={styles.responseTitle}>Response:</Text>
            <Text style={styles.response}>{response}</Text>

            <Button
                title="Go to Details"
                onPress={() => navigation.navigate()}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'stretch',
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        alignSelf: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        marginBottom: 15,
    },
    responseTitle: {
        marginTop: 20,
        fontWeight: 'bold',
    },
    response: {
        marginTop: 5,
        fontFamily: 'monospace',
    },
});
