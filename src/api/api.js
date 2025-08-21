import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { navigateToLogin } from '../navigation/NavigationService';

// const API_URL = 'http://10.0.0.121:8080';
const API_URL = 'https://finanzas-zdt0.onrender.com'; 

// --- API Privada (para endpoints que requieren token) ---
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor de Petición: Añade el token a las cabeceras
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuesta: Maneja los errores de token expirado (401 o 403)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // --- CORRECCIÓN ---
    // Verificamos si el error tiene una respuesta del servidor y un código de estado.
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Token inválido o expirado. Redirigiendo al Login.');
      await AsyncStorage.removeItem('userToken');
      navigateToLogin(); // Solo redirigimos en caso de error de autenticación.
      
      // Detenemos la cadena de promesas para evitar que el error se propague
      return new Promise(() => {}); 
    }
    
    // Para cualquier otro error (ej: 404, 500), simplemente lo devolvemos
    // para que la pantalla que hizo la llamada pueda manejarlo (ej: con un Alert).
    return Promise.reject(error);
  }
);

// --- API Pública (para endpoints como login y registro) ---
// Esta instancia NUNCA enviará un token.
export const publicApi = axios.create({
  baseURL: API_URL,
});

export default api;