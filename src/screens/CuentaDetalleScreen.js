import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getTipoColor = (tipo) => {
  if (tipo === 'AHORRO' || tipo === 'INVERSION') return '#28a745';
  if (tipo === 'CREDITO') return '#dc3545';
  return '#666';
};

const MovimientoItem = ({ item, onDelete }) => {
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({ inputRange: [-80, 0], outputRange: [0, 80], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Ionicons name="trash-outline" size={30} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };
  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.movimientoRow}>
        <View style={styles.movimientoIcon}>
          <Ionicons 
            name={item.tipoMovimiento === 'INGRESO' ? 'arrow-up-circle' : 'arrow-down-circle'} 
            size={30} 
            color={item.tipoMovimiento === 'INGRESO' ? '#28a745' : '#dc3545'} 
          />
        </View>
        <View style={styles.movimientoDetails}>
          <Text style={styles.movimientoConcepto} numberOfLines={1}>{item.concepto}</Text>
          <Text style={styles.movimientoFecha}>{formatDate(item.fecha)}</Text>
        </View>
        <Text style={[styles.movimientoValor, { color: item.tipoMovimiento === 'INGRESO' ? '#28a745' : '#dc3545' }]}>
          {formatCurrency(item.valor)}
        </Text>
      </View>
    </Swipeable>
  );
};

export default function CuentaDetalleScreen({ route }) {
  const { cuentaId } = route.params;
  const [cuentaInfo, setCuentaInfo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { refreshKey, triggerRefresh } = useData();

  const [reajusteModalVisible, setReajusteModalVisible] = useState(false);
  const [reajusteValor, setReajusteValor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllData = async (isInitialLoad = false) => {
    if (loadingMore && !isInitialLoad) return;
    const pageToFetch = isInitialLoad ? 0 : page;
    if (isInitialLoad) { setLoading(true); } else { setLoadingMore(true); }
    try {
      if (isInitialLoad) {
        const cuentaResponse = await api.get(`/api/cuentas/${cuentaId}`);
        setCuentaInfo(cuentaResponse.data);
      }
      const movimientosResponse = await api.get(`/api/cuentas/${cuentaId}/movimientos`, {
        params: { page: pageToFetch, size: 10, mes: currentDate.getMonth() + 1, anio: currentDate.getFullYear() },
      });
      const data = movimientosResponse.data;
      setMovimientos(prev => isInitialLoad ? data.content : [...prev, ...data.content]);
      setTotalPages(data.totalPages);
      setPage(pageToFetch + 1);
    } catch (error) { 
      const message = error.response?.data?.error || 'No se pudo cargar los datos de la cuenta.';
      Alert.alert('Error', message); 
    } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    fetchAllData(true);
  }, [refreshKey, currentDate, cuentaId]);

  const changeMonth = (amount) => {
    setCurrentDate(prevDate => { const newDate = new Date(prevDate); newDate.setMonth(newDate.getMonth() + amount); return newDate; });
  };

  const handleLoadMore = () => { if (page < totalPages && !loadingMore) { fetchAllData(); } };

  const handleDelete = (itemId) => {
    Alert.alert("Confirmar Eliminación", "¿Estás seguro?", [{ text: "Cancelar" }, { text: "Eliminar", style: "destructive", onPress: async () => {
      try { await api.delete(`/api/finanzas/movimientos/${itemId}`); triggerRefresh(); } catch (error) { 
        const message = error.response?.data?.error || 'No se pudo eliminar el movimiento.';
        Alert.alert("Error", message); 
       }
    }}]);
  };

  const handleReajustar = async () => {
    if (!reajusteValor.trim()) {
      Alert.alert('Error', 'Debe ingresar un valor.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/cuentas/reajustar', {
        idCuenta: cuentaId,
        valor: parseFloat(reajusteValor),
      });
      setReajusteModalVisible(false);
      setReajusteValor('');
      triggerRefresh();
      Alert.alert('Éxito', 'La cuenta ha sido reajustada.');
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo reajustar la cuenta.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (<MovimientoItem item={item} onDelete={() => handleDelete(item.id)} />);
  const renderFooter = () => { if (!loadingMore) return null; return <ActivityIndicator style={{ marginVertical: 20 }} />; };

  if (loading && page === 0) {
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      {cuentaInfo && (
        <View style={globalStyles.highlightSection}>
          <Text style={globalStyles.highlightValue}>{formatCurrency(cuentaInfo.balance)}</Text>
          <View style={[globalStyles.infoRow, { width: '100%', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
            <Text style={globalStyles.infoLabel}>Tipo de cuenta:</Text>
            <Text style={[globalStyles.infoValue, { color: getTipoColor(cuentaInfo.tipo), fontWeight: 'bold' }]}>
              {cuentaInfo.tipo}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={globalStyles.reajusteButton} onPress={() => setReajusteModalVisible(true)}>
        <Ionicons name="swap-horizontal-outline" size={22} color="#fff" />
        <Text style={globalStyles.reajusteButtonText}>Reajustar Cuenta</Text>
      </TouchableOpacity>

      <View style={globalStyles.filterContainer}>
        <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={28} color="#007bff" /></TouchableOpacity>
        <Text style={globalStyles.filterText}>
          {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </Text>
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

      <Modal visible={reajusteModalVisible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Reajustar Cuenta</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor actual en la cuenta:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: 500000" value={reajusteValor} onChangeText={setReajusteValor} keyboardType="numeric" />
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setReajusteModalVisible(false)}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleReajustar} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Reajustar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  movimientoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  movimientoIcon: {
    marginRight: 15,
  },
  movimientoDetails: {
    flex: 1,
  },
  movimientoConcepto: {
    fontSize: 16,
    fontWeight: '600',
  },
  movimientoFecha: {
    fontSize: 12,
    color: '#888',
  },
  movimientoValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
});
