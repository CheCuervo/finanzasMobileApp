import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from './CustomDrawerContent';
import TabNavigator from './TabNavigator'; // El navegador de pestañas es la pantalla principal

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* El TabNavigator es ahora la única pantalla dentro del Drawer. */}
      <Drawer.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} // El header lo maneja el TabNavigator
      />
    </Drawer.Navigator>
  );
}