import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

// --- CORRECCIÓN: Se renombra la función ---
const formatTipoReserva = (tipo) => {
  if (tipo === 'GASTO_FIJO') return 'Gasto Fijo';
  if (tipo === 'GASTO_FIJO_MES') return 'Gasto Fijo Mensual';
  if (!tipo) return '';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
};

const getTipoColor = (tipo) => {
  if (tipo === 'AHORRO' || tipo === 'INVERSION') return '#28a745';
  if (tipo === 'GASTO_FIJO' || tipo === 'GASTO_FIJO_MES') return '#dc3545';
  return '#333';
};

const tiposDeReserva = ['AHORRO', 'INVERSION', 'GASTO_FIJO', 'GASTO_FIJO_MES'];

const MovimientoReservaItem = ({ item, onDelete }) => {
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({ inputRange: [-80, 0], outputRange: [0, 80], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Animated.View style={{ transform: [{ translateX: trans }] }}><Ionicons name="trash-outline" size={30} color="#fff" /></Animated.View>
      </TouchableOpacity>
    );
  };
  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.movimientoRow}>
        <View style={styles.movimientoIcon}><Ionicons name={item.tipoMovimiento === 'Reserva' ? 'arrow-up-circle' : 'arrow-down-circle'} size={30} color={item.tipoMovimiento === 'Reserva' ? '#28a745' : '#dc3545'} /></View>
        <View style={styles.movimientoDetails}><Text style={styles.movimientoConcepto} numberOfLines={1}>{item.concepto}</Text><Text style={styles.movimientoFecha}>{formatDate(item.fecha)}</Text></View>
        <Text style={[styles.movimientoValor, { color: item.tipoMovimiento === 'Reserva' ? '#28a745' : '#dc3545' }]}>{formatCurrency(item.valor)}</Text>
      </View>
    </Swipeable>
  );
};

export default function ReservaDetalleScreen({ route, navigation }) {
  const { reserva: initialReserva } = route.params;
  const [reservaInfo, setReservaInfo] = useState(initialReserva);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { refreshKey, triggerRefresh } = useData();

  const [modalVisible, setModalVisible] = useState({ type: null, visible: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [cuentas, setCuentas] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchAllData = async (isInitialLoad = false) => {
    if (loadingMore && !isInitialLoad) return;
    const pageToFetch = isInitialLoad ? 0 : page;
    if (isInitialLoad) { setLoading(true); } else { setLoadingMore(true); }
    try {
      if (isInitialLoad) {
        const resumenResponse = await api.get('/api/reservas/resumen');
        const updatedReserva = resumenResponse.data.reservas.find(r => r.id === initialReserva.id);
        if (updatedReserva) {
          setReservaInfo(updatedReserva);
          navigation.setOptions({ title: updatedReserva.concepto });
        }
      }
      const movimientosResponse = await api.get(`/api/reservas/${initialReserva.id}/movimientos`, {
        params: { page: pageToFetch, size: 10, mes: currentDate.getMonth() + 1, anio: currentDate.getFullYear() },
      });
      const data = movimientosResponse.data;
      setMovimientos(prev => isInitialLoad ? data.content : [...prev, ...data.content]);
      setTotalPages(data.totalPages);
      setPage(pageToFetch + 1);
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo cargar los datos.';
      Alert.alert('Error', message); 
    } finally { 
      setLoading(false); 
      setLoadingMore(false); 
    }
  };

  useEffect(() => {
    fetchAllData(true);
  }, [refreshKey, currentDate, initialReserva.id]);

  const openModal = async (type) => {
    if (type === 'retirar') {
      const response = await api.get('/api/cuentas');
      setCuentas(response.data);
      setFormData({ valor: '', concepto: '', idCuenta: response.data[0]?.id });
    } else if (type === 'abonar') {
      setFormData({ valor: '', concepto: '' });
    } else if (type === 'editar') {
      setFormData({
        concepto: reservaInfo.concepto,
        valorMeta: String(reservaInfo.valorMeta),
        valorReservaSemanal: String(reservaInfo.valorReservaSemanal),
        tipo: reservaInfo.tipo,
        fechaMeta: reservaInfo.fechaMeta ? new Date(reservaInfo.fechaMeta) : new Date(),
      });
    }
    setModalVisible({ type, visible: true });
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAbonar = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/api/reservas/movimientos', {
        idReserva: reservaInfo.id,
        tipoMovimiento: 'Reserva',
        valor: parseFloat(formData.valor),
        concepto: formData.concepto,
      });
      triggerRefresh();
      setModalVisible({ visible: false });
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo realizar el abono.';
      Alert.alert('Error', message); 
     }
    finally { setIsSubmitting(false); }
  };

  const handleRetirar = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/api/reservas/movimientos', {
        idReserva: reservaInfo.id,
        tipoMovimiento: 'Retiro',
        valor: parseFloat(formData.valor),
        concepto: formData.concepto,
        idCuenta: formData.idCuenta,
      });
      triggerRefresh();
      setModalVisible({ visible: false });
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo realizar el retiro.';
      Alert.alert('Error', message); 
     }
    finally { setIsSubmitting(false); }
  };

  const handleEditar = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/api/reservas/${reservaInfo.id}`, {
        ...reservaInfo,
        concepto: formData.concepto,
        valorMeta: parseFloat(formData.valorMeta) || 0,
        valorReservaSemanal: parseFloat(formData.valorReservaSemanal) || 0,
        tipo: formData.tipo,
        fechaMeta: formData.tipo !== 'GASTO_FIJO_MES' ? formData.fechaMeta.toISOString().split('T')[0] : null,
      });
      triggerRefresh();
      setModalVisible({ visible: false });
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo editar la reserva.';
      Alert.alert('Error', message); 
     }
    finally { setIsSubmitting(false); }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || formData.fechaMeta;
    setShowDatePicker(Platform.OS === 'ios');
    handleInputChange('fechaMeta', currentDate);
  };

  const changeMonth = (amount) => {
    setCurrentDate(prevDate => { const newDate = new Date(prevDate); newDate.setMonth(newDate.getMonth() + amount); return newDate; });
  };

  const handleLoadMore = () => { if (page < totalPages && !loadingMore) { fetchAllData(); } };

  const handleDelete = (movimientoId) => {
    Alert.alert("Confirmar Eliminación", "¿Estás seguro?", [{ text: "Cancelar" }, { text: "Eliminar", style: "destructive", onPress: async () => {
      try { await api.delete(`/api/reservas/movimientos/${movimientoId}`); triggerRefresh(); } catch (error) { 
        const message = error.response?.data?.error || 'No se pudo eliminar el movimiento.';
        Alert.alert("Error", message); 
       }
    }}]);
  };

  const renderItem = ({ item }) => (<MovimientoReservaItem item={item} onDelete={() => handleDelete(item.id)} />);
  const renderFooter = () => { if (!loadingMore) return null; return <ActivityIndicator style={{ marginVertical: 20 }} />; };

  if (loading && page === 0) { return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>; }

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      <View style={globalStyles.cardsRow}>
        <View style={globalStyles.summaryCardHalf}>
          <Text style={globalStyles.cardTitleHalf}>Resumen</Text>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Tipo:</Text><Text style={[globalStyles.infoValueHalf, { color: getTipoColor(reservaInfo.tipo), fontWeight: 'bold' }]}>{formatTipoReserva(reservaInfo.tipo)}</Text></View>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Cuota Semanal:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(reservaInfo.valorReservaSemanal)}</Text></View>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Reservado:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(reservaInfo.valorReservado)}</Text></View>
        </View>

        <View style={globalStyles.summaryCardHalf}>
          <Text style={globalStyles.cardTitleHalf}>Progreso</Text>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Meta:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(reservaInfo.valorMeta)}</Text></View>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Ahorrado:</Text><Text style={[globalStyles.infoValueHalf, { color: '#28a745' }]}>{formatCurrency(reservaInfo.valorAhorrado)}</Text></View>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Gastado:</Text><Text style={[globalStyles.infoValueHalf, { color: '#dc3545' }]}>{formatCurrency(reservaInfo.valorGastado)}</Text></View>
          <View style={globalStyles.infoRowHalf}><Text style={globalStyles.infoLabelHalf}>Faltante:</Text><Text style={globalStyles.infoValueHalf}>{formatCurrency(reservaInfo.valorFaltante)}</Text></View>
        </View>
      </View>

      <View style={globalStyles.actionsContainer}>
        <TouchableOpacity style={[globalStyles.actionButton, { backgroundColor: '#28a745' }]} onPress={() => openModal('abonar')}>
          <Ionicons name="trending-up-outline" size={24} color="#fff" />
          <Text style={globalStyles.actionButtonText}>Abonar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[globalStyles.actionButton, { backgroundColor: '#fd7e14' }]} onPress={() => openModal('retirar')}>
          <Ionicons name="trending-down-outline" size={24} color="#fff" />
          <Text style={globalStyles.actionButtonText}>Retirar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[globalStyles.actionButton, { backgroundColor: '#007bff' }]} onPress={() => openModal('editar')}>
          <Ionicons name="pencil-outline" size={24} color="#fff" />
          <Text style={globalStyles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={globalStyles.filterContainer}>
        <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={28} color="#007bff" /></TouchableOpacity>
        <Text style={globalStyles.filterText}>{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={28} color="#007bff" /></TouchableOpacity>
      </View>

      <FlatList
        data={movimientos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Text>No hay movimientos para este mes.</Text></View>}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        style={{ width: '100%' }}
      />

      <Modal visible={modalVisible.visible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            {modalVisible.type === 'abonar' && (
              <>
                <Text style={globalStyles.modalTitle}>Abonar a Reserva</Text>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Valor a abonar:</Text><TextInput style={globalStyles.input} placeholder="Ej: 50000" value={formData.valor} onChangeText={(val) => handleInputChange('valor', val)} keyboardType="numeric" /></View>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Concepto:</Text><TextInput style={globalStyles.input} placeholder="Ej: Ahorro semanal" value={formData.concepto} onChangeText={(val) => handleInputChange('concepto', val)} /></View>
                <View style={globalStyles.modalActions}>
                  <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible({visible: false})}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleAbonar} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator/> : <Text style={globalStyles.buttonText}>Abonar</Text>}</TouchableOpacity>
                </View>
              </>
            )}
            {modalVisible.type === 'retirar' && (
              <>
                <Text style={globalStyles.modalTitle}>Retirar de Reserva</Text>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Valor a retirar:</Text><TextInput style={globalStyles.input} placeholder="Ej: 100000" value={formData.valor} onChangeText={(val) => handleInputChange('valor', val)} keyboardType="numeric" /></View>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Concepto:</Text><TextInput style={globalStyles.input} placeholder="Ej: Pago de servicio" value={formData.concepto} onChangeText={(val) => handleInputChange('concepto', val)} /></View>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Cuenta de Origen:</Text><View style={globalStyles.pickerContainer}><Picker selectedValue={formData.idCuenta} onValueChange={(val) => handleInputChange('idCuenta', val)}>{cuentas.map(c => <Picker.Item key={c.id} label={c.descripcion} value={c.id} />)}</Picker></View></View>
                <View style={globalStyles.modalActions}>
                   <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible({visible: false})}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleRetirar} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator/> : <Text style={globalStyles.buttonText}>Retirar</Text>}</TouchableOpacity>
                </View>
              </>
            )}
            {modalVisible.type === 'editar' && (
              <>
                <Text style={globalStyles.modalTitle}>Editar Reserva</Text>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Concepto:</Text><TextInput style={globalStyles.input} value={formData.concepto} onChangeText={(val) => handleInputChange('concepto', val)} /></View>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Valor Meta:</Text><TextInput style={globalStyles.input} value={formData.valorMeta} onChangeText={(val) => handleInputChange('valorMeta', val)} keyboardType="numeric" /></View>
                <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Reserva Semanal:</Text><TextInput style={globalStyles.input} value={formData.valorReservaSemanal} onChangeText={(val) => handleInputChange('valorReservaSemanal', val)} keyboardType="numeric" /></View>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Tipo de Reserva:</Text>
                  <View style={globalStyles.pickerContainer}>
                    <Picker selectedValue={formData.tipo} onValueChange={(val) => handleInputChange('tipo', val)} itemStyle={globalStyles.pickerItem}>
                      {tiposDeReserva.map(t => <Picker.Item key={t} label={formatTipoReserva(t)} value={t} />)}
                    </Picker>
                  </View>
                </View>
                {formData.tipo !== 'GASTO_FIJO_MES' && (
                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Fecha Meta:</Text>
                    <TouchableOpacity style={globalStyles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                      <Text>{formData.fechaMeta.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {showDatePicker && <DateTimePicker value={formData.fechaMeta} mode="date" display="default" onChange={onChangeDate} />}
                <View style={globalStyles.modalActions}>
                  <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible({visible: false})}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleEditar} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator/> : <Text style={globalStyles.buttonText}>Guardar</Text>}</TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  movimientoRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  movimientoIcon: { marginRight: 15 },
  movimientoDetails: { flex: 1 },
  movimientoConcepto: { fontSize: 16, fontWeight: '600' },
  movimientoFecha: { fontSize: 12, color: '#888' },
  movimientoValor: { fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', width: 80 },
});
