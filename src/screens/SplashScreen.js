import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import api from '../api/api';
import { globalStyles } from '../styles/globalStyles';

const wakeUpServer = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await api.get('/actuator/health');
      console.log('Server is awake!');
      return true; // El servidor respondió
    } catch (error) {
      console.log(`Attempt ${i + 1} to wake server failed. Retrying in 3 seconds...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos
      }
    }
  }
  return false; // El servidor no respondió después de los reintentos
};

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // 1. Intentamos despertar el servidor.
        await wakeUpServer();

        // 2. Intentamos obtener el token del usuario.
        const userToken = await AsyncStorage.getItem('userToken');

        // 3. Si hay un token, intentamos validarlo.
        if (userToken) {
          // El interceptor de axios ya añade el token a esta petición.
          await api.get('/api/finanzas/resumen');
          // Si la petición es exitosa, el token es válido.
          navigation.replace('MainApp');
        } else {
          // Si no hay token, vamos al Login.
          navigation.replace('Login');
        }
      } catch (error) {
        // Si CUALQUIER paso del bloque try falla (error de red, token inválido, etc.),
        // la sesión no es válida. Limpiamos el token por si acaso y vamos al Login.
        console.error("Bootstrap failed, redirecting to Login:", error);
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Login');
      }
    };

    bootstrapAsync();
  }, [navigation]);

  return (
    <View style={globalStyles.container}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.loadingText}>
        Iniciando servicios, por favor espere...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
