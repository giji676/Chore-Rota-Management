import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../utils/api";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [response, setResponse] = useState('');

    const handleLogin = async () => {
        try {
            const res = await api.post("accounts/login/", { username, password });
            await AsyncStorage.setItem('access', res.data.access);
            navigation.replace('HouseAccess');
        } catch (err) {
            setResponse(err.response?.data || err.message);
        }
    };

    const handleRegister = async () => {
        try {
            const res = await api.post("accounts/register/", { username, password, email });
            await AsyncStorage.setItem('access', res.data.access);
            navigation.replace('HouseAccess');
        } catch (err) {
            setResponse(err.response?.data || err.message);
        }
    };

    const handleGuest = async () => {
        console.log("guest login");
        let device_id = await AsyncStorage.getItem("device_id");
        if (!device_id) {
            device_id = uuidv4();
            await AsyncStorage.setItem("device_id", device_id);
        }
        try {
            const res = await api.post("accounts/guest/", { "device_id": device_id });
            await AsyncStorage.setItem("access_token", res.data.access_token);
            await AsyncStorage.setItem("refresh_token", res.data.refresh_token);
            navigation.replace("HouseAccess");
        } catch (err) {
            console.log(err.response?.data || err.message);
            setResponse(err.response?.data || err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login / Register / Guest</Text>

            <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
            <TextInput placeholder="Email (register only)" value={email} onChangeText={setEmail} style={styles.input} />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

            <Button title="Login" onPress={handleLogin} />
            <View style={{ height: 10 }} />
            <Button title="Register" onPress={handleRegister} />
            <View style={{ height: 10 }} />
            <Button title="Continue as Guest" onPress={handleGuest} />

            <Text style={styles.response}>{JSON.stringify(response)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex:1, justifyContent:'center', padding:20 },
    input: { borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:10, marginBottom:10 },
    title: { fontSize:24, marginBottom:20, textAlign:'center' },
    response: { marginTop:20, color:'red' }
});
