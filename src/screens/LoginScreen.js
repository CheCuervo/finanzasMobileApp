import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { publicApi } from '../api/api'; // Se usa la API pública para no enviar tokens expirados
import { globalStyles } from '../styles/globalStyles';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, ingresa tu email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const response = await publicApi.post('/auth/login', {
        email: email,
        password: password,
      });

      const { token } = response.data;
      await AsyncStorage.setItem('userToken', token);
      navigation.replace('MainApp');

    } catch (error) {
      Alert.alert('Error de inicio de sesión', 'El email o la contraseña son incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={globalStyles.title}>Iniciar Sesión</Text>
      <TextInput
        style={globalStyles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={globalStyles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>
    </View>
  );
}
