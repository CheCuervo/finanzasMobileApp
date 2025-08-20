import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CuentaDetalleScreen from '../screens/CuentaDetalleScreen';
import CuentasScreen from '../screens/CuentasScreen';
import HomeScreen from '../screens/HomeScreen';
import PresupuestoCategoriaScreen from '../screens/PresupuestoCategoriaScreen';
import PresupuestoScreen from '../screens/PresupuestoScreen';
import ProyeccionesScreen from '../screens/ProyeccionesScreen';
import ReservaDetalleScreen from '../screens/ReservaDetalleScreen';
import ReservasScreen from '../screens/ReservasScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Componente para el botón del menú de hamburguesa en el header
const HeaderMenuButton = ({ navigation }) => (
  <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 15 }}>
    <Ionicons name="menu" size={30} color="#333" />
  </TouchableOpacity>
);

// Stacks para cada pestaña
function HomeStack({ navigation }) {
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitleAlign: 'center',
      headerLeft: () => <HeaderMenuButton navigation={navigation} />
    }}>
      <Stack.Screen name="ResumenHome" component={HomeScreen} options={{ title: 'Resumen Financiero' }} />
      <Stack.Screen name="CuentaDetalle" component={CuentaDetalleScreen} options={({ route }) => ({ title: route.params.cuentaDescripcion })} />
      <Stack.Screen name="Presupuesto" component={PresupuestoScreen} options={{ title: 'Presupuesto' }} />
      <Stack.Screen name="PresupuestoCategoria" component={PresupuestoCategoriaScreen} options={({ route }) => ({ title: `Presupuesto ${route.params.title}` })} />
    </Stack.Navigator>
  );
}

function CuentasStack({ navigation }) {
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitleAlign: 'center',
      headerLeft: () => <HeaderMenuButton navigation={navigation} />
    }}>
      <Stack.Screen name="CuentasList" component={CuentasScreen} options={{ title: 'Mis Cuentas' }} />
      <Stack.Screen name="CuentaDetalle" component={CuentaDetalleScreen} options={({ route }) => ({ title: route.params.cuentaDescripcion })} />
    </Stack.Navigator>
  );
}

function ReservasStack({ navigation }) {
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitleAlign: 'center',
      headerLeft: () => <HeaderMenuButton navigation={navigation} />
    }}>
      <Stack.Screen name="ReservasList" component={ReservasScreen} options={{ title: 'Ahorros y Gastos Fijos' }} />
      <Stack.Screen name="ReservaDetalle" component={ReservaDetalleScreen} options={({ route }) => ({ title: route.params.reserva.concepto })} />
    </Stack.Navigator>
  );
}

function ProyeccionesStack({ navigation }) {
  return (
    <Stack.Navigator screenOptions={{ 
      headerTitleAlign: 'center',
      headerLeft: () => <HeaderMenuButton navigation={navigation} />
    }}>
      <Stack.Screen name="ProyeccionesList" component={ProyeccionesScreen} options={{ title: 'Proyecciones' }} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: '#fff', 
          height: 55 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'CuentasTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'ReservasTab') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'ProyeccionesTab') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          }
          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
        options={{ title: 'Resumen' }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('HomeTab', { screen: 'ResumenHome' });
          },
        })}
      />
      <Tab.Screen 
        name="CuentasTab" 
        component={CuentasStack} 
        options={{ title: 'Cuentas' }} 
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('CuentasTab', { screen: 'CuentasList' });
          },
        })}
      />
      <Tab.Screen 
        name="ReservasTab" 
        component={ReservasStack} 
        options={{ title: 'Ahorros' }} 
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('ReservasTab', { screen: 'ReservasList' });
          },
        })}
      />
      <Tab.Screen 
        name="ProyeccionesTab" 
        component={ProyeccionesStack} 
        options={{ title: 'Proyecciones' }} 
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('ProyeccionesTab', { screen: 'ProyeccionesList' });
          },
        })}
      />
    </Tab.Navigator>
  );
}
