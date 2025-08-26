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
      <View style={globalStyles.movimientoRow}>
        <View style={globalStyles.movimientoIcon}><Ionicons name={item.tipoMovimiento === 'Reserva' ? 'arrow-up-circle' : 'arrow-down-circle'} size={30} color={item.tipoMovimiento === 'Reserva' ? '#28a745' : '#dc3545'} /></View>
        <View style={globalStyles.movimientoDetails}><Text style={globalStyles.movimientoConcepto} numberOfLines={1}>{item.concepto}</Text><Text style={globalStyles.movimientoFecha}>{formatDate(item.fecha)}</Text></View>
        <Text style={[globalStyles.movimientoValor, { color: item.tipoMovimiento === 'Reserva' ? '#28a745' : '#dc3545' }]}>{formatCurrency(item.valor)}</Text>
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
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);

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

  const handleEliminarReserva = () => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Está seguro de que desea eliminar esta reserva? Esta acción no se puede deshacer. " +
      "Tenga en cuenta que el valor ahorrado debe ser igual a 0 para eliminar la reserva.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: async () => {
          setLoading(true);
          try {
            await api.delete(`/api/reservas/${reservaInfo.id}`);
            Alert.alert('Éxito', 'Reserva eliminada correctamente.');
            triggerRefresh();
            navigation.goBack();
          } catch (error) {
            const message = error.response?.data?.error || 'No se pudo eliminar la reserva.';
            console.error('Error al eliminar reserva:', message);
            Alert.alert('Error', message);
          } finally {
            setLoading(false);
          }
        }, style: 'destructive' },
      ]
    );
  };

  const renderItem = ({ item }) => (<MovimientoReservaItem item={item} onDelete={() => handleDelete(item.id)} />);
  const renderFooter = () => { if (!loadingMore) return null; return <ActivityIndicator style={{ marginVertical: 20 }} />; };

  if (loading && page === 0) { return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>; }

  const cuotaSugeridaColor = reservaInfo.cuotaSugerida > reservaInfo.valorReservaSemanal ? '#dc3545' : '#333';
  const fechaMetaRealColor = 
    reservaInfo.fechaMetaReal && 
    reservaInfo.fechaMeta && 
    new Date(reservaInfo.fechaMetaReal) > new Date(reservaInfo.fechaMeta) 
    ? '#dc3545' 
    : '#333';

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      
      <View style={globalStyles.highlightSection}>
        <Text style={styles.highlightLabel}>Valor Reservado</Text>
        <Text style={globalStyles.highlightValue}>{formatCurrency(reservaInfo.valorReservado)}</Text>
        <Text style={[globalStyles.highlightSubtitle, { color: getTipoColor(reservaInfo.tipo) }]}>
          {formatTipoReserva(reservaInfo.tipo)}
        </Text>
      </View>

      <View style={globalStyles.summaryCard}>
        <TouchableOpacity 
          style={styles.collapsibleHeader} 
          onPress={() => setIsDetailsExpanded(!isDetailsExpanded)}
          activeOpacity={0.8}
        >
          <Text style={globalStyles.cardTitleNoBorder}>Detalles y Progreso</Text>
          <Ionicons 
            name={isDetailsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={24} 
            color="#333" 
          />
        </TouchableOpacity>
        
        {isDetailsExpanded && (
          <View style={styles.collapsibleContent}>
            <View style={globalStyles.infoRowCompact}>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Meta:</Text>
                <Text style={globalStyles.infoValueCompact}>{formatCurrency(reservaInfo.valorMeta)}</Text>
              </View>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Ahorrado:</Text>
                <Text style={[globalStyles.infoValueCompact, { color: '#28a745' }]}>{formatCurrency(reservaInfo.valorAhorrado)}</Text>
              </View>
            </View>
            <View style={globalStyles.infoRowCompact}>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Gastado:</Text>
                <Text style={[globalStyles.infoValueCompact, { color: '#dc3545' }]}>{formatCurrency(reservaInfo.valorGastado)}</Text>
              </View>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Faltante:</Text>
                <Text style={globalStyles.infoValueCompact}>{formatCurrency(reservaInfo.valorFaltante)}</Text>
              </View>
            </View>
            <View style={[globalStyles.infoRowCompact, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' }]}>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Cuota Semanal:</Text>
                <Text style={globalStyles.infoValueCompact}>{formatCurrency(reservaInfo.valorReservaSemanal)}</Text>
              </View>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Cuota Sugerida:</Text>
                <Text style={[globalStyles.infoValueCompact, { color: cuotaSugeridaColor }]}>{formatCurrency(reservaInfo.cuotaSugerida)}</Text>
              </View>
            </View>
            <View style={globalStyles.infoRowCompact}>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Fecha Meta:</Text>
                <Text style={globalStyles.infoValueCompact}>{formatDate(reservaInfo.fechaMeta)}</Text>
              </View>
              <View style={globalStyles.infoItemHalf}>
                <Text style={globalStyles.infoLabelCompact}>Fecha Meta Real:</Text>
                <Text style={[globalStyles.infoValueCompact, { color: fechaMetaRealColor }]}>{formatDate(reservaInfo.fechaMetaReal)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#28a745' }]} onPress={() => openModal('abonar')}>
          <Ionicons name="trending-up-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Abonar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fd7e14' }]} onPress={() => openModal('retirar')}>
          <Ionicons name="trending-down-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Retirar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#007bff' }]} onPress={() => openModal('editar')}>
          <Ionicons name="pencil-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#dc3545' }]} 
          onPress={handleEliminarReserva}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
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
  deleteButton: { 
    backgroundColor: '#dc3545', 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 80 
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collapsibleContent: {
    paddingTop: 15,
  },
  highlightLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});