import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const getTipoColor = (tipo) => {
  if (tipo === 'AHORRO' || tipo === 'INVERSION') return '#28a745'; // Verde
  if (tipo === 'CREDITO') return '#dc3545'; // Rojo
  return '#333'; // Color por defecto
};

const tiposDeCuenta = ['AHORRO', 'INVERSION', 'CREDITO'];

export default function CuentasScreen({ navigation }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevaCuentaNombre, setNuevaCuentaNombre] = useState('');
  const [nuevaCuentaTipo, setNuevaCuentaTipo] = useState(tiposDeCuenta[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshKey, triggerRefresh } = useData();

  const fetchCuentas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cuentas');
      setCuentas(response.data);
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo cargar la lista de cuentas.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCuentas(); }, [refreshKey]));

  const handleAgregarCuenta = async () => {
    if (!nuevaCuentaNombre.trim()) {
      Alert.alert('Error', 'El nombre de la cuenta no puede estar vacío.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/cuentas', {
        descripcion: nuevaCuentaNombre,
        tipo: nuevaCuentaTipo,
      });
      setModalVisible(false);
      setNuevaCuentaNombre('');
      setNuevaCuentaTipo(tiposDeCuenta[0]);
      triggerRefresh();
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo crear la cuenta.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CuentaDetalle', { cuentaId: item.id, cuentaDescripcion: item.descripcion })}>
      <View style={globalStyles.tableRow}>
        <Text style={[globalStyles.tableCell, { flex: 2 }]} numberOfLines={1}>{item.descripcion}</Text>
        <Text style={[globalStyles.tableCell, { color: getTipoColor(item.tipo), fontWeight: 'bold' }]}>{item.tipo}</Text>
        <Text style={[globalStyles.tableCell, { textAlign: 'right' }]}>{formatCurrency(item.balance)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      <TouchableOpacity style={globalStyles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={globalStyles.addButtonText}>Nueva Cuenta</Text>
      </TouchableOpacity>

      <View style={globalStyles.tableContainer}>
        <View style={globalStyles.tableHeader}>
          <Text style={[globalStyles.tableHeaderCell, { flex: 2 }]}>Nombre</Text>
          <Text style={globalStyles.tableHeaderCell}>Tipo</Text>
          <Text style={[globalStyles.tableHeaderCell, { textAlign: 'right' }]}>Balance</Text>
        </View>
        <FlatList
          data={cuentas}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Text style={{ color: '#666' }}>No tienes cuentas registradas.</Text></View>}
        />
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Agregar Nueva Cuenta</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Nombre de la cuenta:</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Ej: Cuenta de Ahorros"
                value={nuevaCuentaNombre}
                onChangeText={setNuevaCuentaNombre}
              />
            </View>
            <Text style={{ marginBottom: 10, color: '#666' }}>Tipo de cuenta:</Text>
            <View style={globalStyles.typeSelectorContainer}>
              {tiposDeCuenta.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    globalStyles.typeButton,
                    nuevaCuentaTipo === tipo && globalStyles.typeButtonSelected,
                  ]}
                  onPress={() => setNuevaCuentaTipo(tipo)}
                >
                  <Text style={[
                    globalStyles.typeButtonText,
                    nuevaCuentaTipo === tipo && globalStyles.typeButtonTextSelected,
                  ]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, { backgroundColor: '#6c757d', width: '48%' }]} onPress={() => setModalVisible(false)}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, { width: '48%' }]} onPress={handleAgregarCuenta} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Agregar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
