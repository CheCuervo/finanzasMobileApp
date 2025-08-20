import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const ProyeccionItem = ({ item, onEdit, onDelete }) => {
  const renderRightActions = () => {
    return (
      <View style={globalStyles.swipeActionContainer}>
        <TouchableOpacity 
          style={[globalStyles.swipeActionButton, { backgroundColor: '#007bff' }]}
          onPress={onEdit}
        >
          <Ionicons name="pencil-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[globalStyles.swipeActionButton, { backgroundColor: '#dc3545' }]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity onPress={onEdit}>
        <View style={styles.proyeccionRow}>
          <Text style={styles.proyeccionConcepto}>{item.concepto}</Text>
          <Text style={styles.proyeccionValor}>{formatCurrency(item.valor)}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function ProyeccionesScreen() {
  const [proyecciones, setProyecciones] = useState([]);
  const [totalProyecciones, setTotalProyecciones] = useState(0);
  const [loading, setLoading] = useState(true);
  const { refreshKey, triggerRefresh } = useData();

  const [modalVisible, setModalVisible] = useState({ type: null, visible: false, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ concepto: '', valor: '' });

  const fetchProyecciones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/proyecciones');
      setProyecciones(response.data);
      const total = response.data.reduce((sum, item) => sum + item.valor, 0);
      setTotalProyecciones(total);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar las proyecciones.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProyecciones(); }, [refreshKey]));

  const openModal = (type, data = null) => {
    if (type === 'editar') {
      setFormData({ concepto: data.concepto, valor: String(data.valor) });
    } else {
      setFormData({ concepto: '', valor: '' });
    }
    setModalVisible({ type, visible: true, data });
  };

  const handleSave = async () => {
    if (!formData.concepto.trim() || !formData.valor.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        concepto: formData.concepto,
        valor: parseFloat(formData.valor),
      };
      if (modalVisible.type === 'editar') {
        await api.put(`/api/proyecciones/${modalVisible.data.id}`, payload);
      } else {
        await api.post('/api/proyecciones', payload);
      }
      triggerRefresh();
      setModalVisible({ visible: false });
    } catch (error) {
      const message = error.response?.data?.error || `No se pudo ${modalVisible.type === 'editar' ? 'editar' : 'agregar'} la proyección.`;
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Confirmar Eliminación",
      `¿Estás seguro de que deseas eliminar la proyección "${item.concepto}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/api/proyecciones/${item.id}`);
              triggerRefresh();
            } catch (error) {
              const message = error.response?.data?.error || 'No se pudo eliminar la proyección.';
              Alert.alert("Error", message);
            }
          } 
        }
      ]
    );
  };

  if (loading) {
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
      <View style={globalStyles.highlightSection}>
        <Text style={globalStyles.highlightTitle}>Total Proyecciones:</Text>
        <Text style={globalStyles.highlightValue}>{formatCurrency(totalProyecciones)}</Text>
      </View>

      <TouchableOpacity style={globalStyles.addButton} onPress={() => openModal('agregar')}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={globalStyles.addButtonText}>Agregar Proyección</Text>
      </TouchableOpacity>

      <FlatList
        data={proyecciones}
        renderItem={({ item }) => (
          <ProyeccionItem 
            item={item} 
            onEdit={() => openModal('editar', item)} 
            onDelete={() => handleDelete(item)} 
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        style={{ width: '100%' }}
        ListEmptyComponent={<View style={{alignItems: 'center', marginTop: 50}}><Text>No hay proyecciones.</Text></View>}
      />

      <Modal visible={modalVisible.visible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>{modalVisible.type === 'editar' ? 'Editar' : 'Nueva'} Proyección</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Concepto:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: Devolución de impuestos" value={formData.concepto} onChangeText={(text) => setFormData({...formData, concepto: text})} />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: 750000" value={formData.valor} onChangeText={(text) => setFormData({...formData, valor: text})} keyboardType="numeric" />
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={() => setModalVisible({visible: false})}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleSave} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={globalStyles.buttonText}>Guardar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  proyeccionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  proyeccionConcepto: {
    fontSize: 16,
    flex: 1,
  },
  proyeccionValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
