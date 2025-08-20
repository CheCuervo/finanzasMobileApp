import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};
const getTipoColor = (tipo) => {
  if (tipo === 'AHORRO' || tipo === 'INVERSION') return '#28a745';
  if (tipo === 'CREDITO') return '#dc3545';
  return '#333';
};

export default function HomeScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey, triggerRefresh } = useData();

  const [modalVisible, setModalVisible] = useState({ type: null, visible: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [cuentasCredito, setCuentasCredito] = useState([]);
  const [cuentasDebito, setCuentasDebito] = useState([]);

  const fetchSummary = async () => {
    try { 
      setLoading(true); 
      const response = await api.get('/api/finanzas/resumen'); 
      setSummary(response.data); 
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo cargar el resumen.';
      Alert.alert('Error', message); 
    } finally { 
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { 
    fetchSummary(); 
  }, [refreshKey]));

  const openModal = async (type) => {
    const allCuentas = summary?.cuentas || [];
    if (type === 'tc') {
      const filtered = allCuentas.filter(c => c.tipo === 'CREDITO');
      if (filtered.length === 0) {
        Alert.alert('Información', 'No tienes cuentas de tipo CRÉDITO para realizar esta operación.');
        return;
      }
      setCuentasCredito(filtered);
      setFormData({ valor: '', concepto: '', idCuenta: filtered[0]?.id });
    } else if (type === 'debito') {
      const filtered = allCuentas.filter(c => c.tipo === 'AHORRO' || c.tipo === 'INVERSION');
       if (filtered.length === 0) {
        Alert.alert('Información', 'No tienes cuentas de tipo AHORRO o INVERSIÓN para realizar esta operación.');
        return;
      }
      setCuentasDebito(filtered);
      setFormData({ valor: '', concepto: '', idCuenta: filtered[0]?.id });
    }
    setModalVisible({ type, visible: true });
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitMovimiento = async () => {
    if (!formData.valor || !formData.concepto?.trim() || !formData.idCuenta) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      const tipoMovimiento = modalVisible.type === 'tc' ? 'INGRESO' : 'EGRESO';
      await api.post('/api/finanzas/movimientos', { ...formData, tipoMovimiento });
      triggerRefresh();
      setModalVisible({ visible: false });
      Alert.alert('Éxito', 'Movimiento registrado correctamente.');
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo registrar el movimiento.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalDisponibleColor = (value) => {
    if (value == null || value === 0) return '#333';
    return value > 0 ? '#28a745' : '#dc3545';
  };

  if (loading) { 
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>; 
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
        {summary && (
          <View style={globalStyles.highlightSection}>
            <Text style={globalStyles.highlightTitle}>Total disponible:</Text>
            <Text style={[globalStyles.highlightValue, { color: getTotalDisponibleColor(summary.dineroDisponibleConProyecciones) }]}>
              {formatCurrency(summary.dineroDisponibleConProyecciones)}
            </Text>
          </View>
        )}

        <View style={globalStyles.homeActionsContainer}>
          <TouchableOpacity style={[globalStyles.homeActionButton, { backgroundColor: '#dc3545', marginRight: 10 }]} onPress={() => openModal('tc')}>
            <Ionicons name="card-outline" size={22} color="#fff" />
            <Text style={globalStyles.homeActionButtonText}>Pago con TC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.homeActionButton, { backgroundColor: '#17a2b8' }]} onPress={() => openModal('debito')}>
            <Ionicons name="cash-outline" size={22} color="#fff" />
            <Text style={globalStyles.homeActionButtonText}>Pago Débito</Text>
          </TouchableOpacity>
        </View>

        <Text style={globalStyles.title}>Resumen Financiero</Text>
        {summary && (
          <View style={globalStyles.summaryContainer}>
            <View style={globalStyles.summaryCard}>
              <Text style={globalStyles.cardTitle}>Disponibilidad</Text>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Disponible sin proy:</Text><Text style={globalStyles.infoValue}>{formatCurrency(summary.dineroDisponible)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Disponible con proy:</Text><Text style={globalStyles.infoValue}>{formatCurrency(summary.dineroDisponibleConProyecciones)}</Text></View>
            </View>
            <View style={globalStyles.cardsRow}>
              <View style={globalStyles.summaryCardHalf}>
                <Text style={globalStyles.cardTitleHalf}>Patrimonio</Text>
                <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Total:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(summary.dineroTotal)}</Text></View>
                <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>+ Proy:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(summary.dineroTotalConProyecciones)}</Text></View>
              </View>
              <View style={globalStyles.summaryCardHalf}>
                <Text style={globalStyles.cardTitleHalf}>Compromisos</Text>
                <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Reservado:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(summary.dineroReservado)}</Text></View>
                <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Proyectado:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(summary.totalProyecciones)}</Text></View>
              </View>
            </View>
            <View style={globalStyles.summaryCard}>
              <Text style={globalStyles.cardTitle}>Resumen de Cuentas</Text>
              {summary.cuentas.map((cuenta) => (
                <TouchableOpacity key={cuenta.id} style={globalStyles.accordionHeader} onPress={() => navigation.navigate('CuentaDetalle', { cuentaId: cuenta.id, cuentaDescripcion: cuenta.descripcion })}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={globalStyles.accordionHeaderText} numberOfLines={1} ellipsizeMode="tail">
                      {cuenta.descripcion} - <Text style={{ color: getTipoColor(cuenta.tipo), fontWeight: 'bold' }}>{cuenta.tipo}</Text> - {formatCurrency(cuenta.balance)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={22} color="#007bff" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
      
      <Modal visible={modalVisible.visible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>{modalVisible.type === 'tc' ? 'Pago con Tarjeta de Crédito' : 'Pago con Débito'}</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: 150000" value={formData.valor} onChangeText={(val) => handleInputChange('valor', val)} keyboardType="numeric" />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Concepto:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: Compra supermercado" value={formData.concepto} onChangeText={(val) => handleInputChange('concepto', val)} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Cuenta:</Text>
              <View style={globalStyles.pickerContainer}>
                <Picker selectedValue={formData.idCuenta} onValueChange={(val) => handleInputChange('idCuenta', val)} itemStyle={globalStyles.pickerItem}>
                  {(modalVisible.type === 'tc' ? cuentasCredito : cuentasDebito).map(c => <Picker.Item key={c.id} label={c.descripcion} value={c.id} />)}
                </Picker>
              </View>
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible({visible: false})}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleSubmitMovimiento} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator/> : <Text style={globalStyles.buttonText}>Agregar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
