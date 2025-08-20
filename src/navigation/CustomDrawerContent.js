import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CustomDrawerContent(props) {
  const handleLogout = () => {
    AsyncStorage.removeItem('userToken');
    props.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1, paddingVertical: 20 }}>
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {
            // Navega a la pantalla de Inicio (que es el TabNavigator)
            props.navigation.navigate('MainTabs', { screen: 'HomeTab' });
            props.navigation.closeDrawer();
          }}
        >
          <Ionicons name="home-outline" size={22} color="#333" />
          <Text style={styles.drawerItemText}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {
            // Navega a la pantalla de Presupuesto dentro del HomeStack
            props.navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen: 'Presupuesto' } });
            props.navigation.closeDrawer();
          }}
        >
          <Ionicons name="options-outline" size={22} color="#333" />
          <Text style={styles.drawerItemText}>Presupuesto</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomSection}>
        <View style={styles.separator} />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#dc3545" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  drawerItemText: {
    fontSize: 15,
    marginLeft: 15,
    fontWeight: '500',
    color: '#333',
  },
  bottomSection: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  separator: {
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    marginVertical: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: 'bold',
    color: '#dc3545',
  },
});
