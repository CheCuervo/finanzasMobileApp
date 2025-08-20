import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const ReservaItem = ({ item, onEdit }) => {
  const renderRightActions = () => (
    <TouchableOpacity onPress={onEdit} style={[globalStyles.swipeActionButton, { backgroundColor: '#007bff' }]}>
      <Ionicons name="pencil-outline" size={28} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.reservaRow}>
        <Text style={styles.reservaConcepto}>{item.concepto}</Text>
        <Text style={styles.reservaValor}>{formatCurrency(item.valorReservaSemanal)}</Text>
      </View>
    </Swipeable>
  );
};

export default function PresupuestoCategoriaScreen({ route }) {
  const { title, totalReal, totalSugerido, diferencia, reservas } = route.params;
  const { triggerRefresh } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [nuevoValor, setNuevoValor] = useState('');

  const openModal = (item) => {
    setCurrentItem(item);
    setNuevoValor(String(item.valorReservaSemanal));
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!nuevoValor) {
      Alert.alert('Error', 'El valor no puede estar vacío.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.get(`/api/reservas/${currentItem.id}`);
      const reservaCompleta = response.data;

      await api.put(`/api/reservas/${currentItem.id}`, {
        ...reservaCompleta,
        valorReservaSemanal: parseFloat(nuevoValor),
      });
      triggerRefresh();
      setModalVisible(false);
    } catch (error) {
      // --- CORRECCIÓN ---
      // Se obtiene el mensaje de error específico del servidor.
      const message = error.response?.data?.error || 'No se pudo actualizar la reserva.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      <View style={globalStyles.summaryCard}>
        <View style={globalStyles.infoRow}>
          <Text style={globalStyles.infoLabel}>Valor Real:</Text>
          <Text style={globalStyles.infoValue}>{formatCurrency(totalReal)}</Text>
        </View>
        <View style={globalStyles.infoRow}>
          <Text style={globalStyles.infoLabel}>Valor Sugerido:</Text>
          <Text style={globalStyles.infoValue}>{formatCurrency(totalSugerido)}</Text>
        </View>
        <View style={[globalStyles.infoRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
          <Text style={globalStyles.infoLabel}>{diferencia >= 0 ? 'Faltante:' : 'Exceso:'}</Text>
          <Text style={[globalStyles.infoValue, { color: diferencia >= 0 ? '#6c757d' : '#dc3545' }]}>
            {formatCurrency(Math.abs(diferencia))}
          </Text>
        </View>
      </View>

      <FlatList
        data={reservas}
        renderItem={({ item }) => <ReservaItem item={item} onEdit={() => openModal(item)} />}
        keyExtractor={(item) => item.id.toString()}
        style={{ width: '100%', marginTop: 20 }}
        ListEmptyComponent={<View style={{alignItems: 'center'}}><Text>No hay reservas en esta categoría.</Text></View>}
      />

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Editar Cuota Semanal</Text>
            <Text style={styles.modalConcepto}>{currentItem?.concepto}</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Nueva Cuota Semanal:</Text>
              <TextInput style={globalStyles.input} value={nuevoValor} onChangeText={setNuevoValor} keyboardType="numeric" />
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible(false)}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleUpdate} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={globalStyles.buttonText}>Guardar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  reservaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reservaConcepto: { fontSize: 16, flex: 1 },
  reservaValor: { fontSize: 16, fontWeight: 'bold' },
  modalConcepto: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
});
