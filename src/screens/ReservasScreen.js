import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatTipoForDisplay = (tipo) => {
  if (tipo === 'GASTO_FIJO') return 'Gasto Fijo';
  if (tipo === 'GASTO_FIJO_MES') return 'Gasto Fijo Mensual';
  if (tipo === 'ALL') return 'Todas';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
};

const tiposDeReserva = ['AHORRO', 'INVERSION', 'GASTO_FIJO', 'GASTO_FIJO_MES'];
const tiposDeReservaMasiva = ['ALL', 'AHORRO', 'INVERSION', 'GASTO_FIJO', 'GASTO_FIJO_MES'];

const TipoReservaAccordion = ({ title, totalReservado, reservas, isExpanded, onPress, navigation }) => {
  return (
    <View>
      <TouchableOpacity style={globalStyles.accordionSectionHeader} onPress={onPress}>
        <View style={globalStyles.accordionTitleContainer}>
          <Text style={globalStyles.accordionSectionTitle}>{title}</Text>
          <Text style={globalStyles.accordionSectionSubtitle}>Total Reservado: {formatCurrency(totalReservado)}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-down-circle-outline' : 'chevron-forward-circle-outline'} size={28} color="#007bff" />
      </TouchableOpacity>
      {isExpanded && (
        <View>
          <View style={globalStyles.reservaListHeader}>
            <Text style={[globalStyles.reservaListHeaderText, { flex: 2 }]}>Nombre</Text>
            <Text style={[globalStyles.reservaListHeaderText, { flex: 1.2, textAlign: 'center' }]}>Semanal</Text>
            <Text style={[globalStyles.reservaListHeaderText, { flex: 1.2, textAlign: 'right' }]}>Reservado</Text>
            <View style={{ width: 20 }} />
          </View>
          {reservas.map(reserva => (
            <TouchableOpacity 
              key={reserva.id} 
              style={globalStyles.reservaListItem}
              onPress={() => navigation.navigate('ReservaDetalle', { reserva: reserva })}
            >
              <Text style={[globalStyles.reservaListItemText, { flex: 2 }]} numberOfLines={1}>{reserva.concepto}</Text>
              <Text style={[globalStyles.reservaListItemText, { flex: 1.2, textAlign: 'center' }]}>{formatCurrency(reserva.valorReservaSemanal)}</Text>
              <Text style={[globalStyles.reservaListItemText, { flex: 1.2, textAlign: 'right', fontWeight: 'bold' }]}>{formatCurrency(reserva.valorReservado)}</Text>
              <View style={{ width: 20, alignItems: 'flex-end' }}>
                <Ionicons name="chevron-forward-outline" size={20} color="#007bff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ReservasScreen({ navigation }) {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({ AHORRO: false, INVERSION: false, GASTO_FIJO: false, GASTO_FIJO_MES: false });
  const { refreshKey, triggerRefresh } = useData();

  const [nuevaModalVisible, setNuevaModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevaReserva, setNuevaReserva] = useState({ concepto: '', tipo: tiposDeReserva[0], valorMeta: '', valorReservaSemanal: '', fechaMeta: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [masivoModalVisible, setMasivoModalVisible] = useState(false);
  const [abonoMasivo, setAbonoMasivo] = useState({ nmSemanas: '', concepto: '', tipoReserva: tiposDeReservaMasiva[0] });

  const fetchResumenReservas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reservas/resumen');
      setResumen(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el resumen de reservas.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchResumenReservas(); }, [refreshKey]));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleInputChange = (form, name, value) => {
    if (form === 'nueva') {
      setNuevaReserva(prev => ({ ...prev, [name]: value }));
    } else if (form === 'masivo') {
      setAbonoMasivo(prev => ({ ...prev, [name]: value }));
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || nuevaReserva.fechaMeta;
    setShowDatePicker(Platform.OS === 'ios');
    handleInputChange('nueva', 'fechaMeta', currentDate);
  };

  const handleAgregarReserva = async () => {
    if (!nuevaReserva.concepto.trim()) {
      Alert.alert('Error', 'El concepto no puede estar vacío.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...nuevaReserva,
        valorMeta: parseFloat(nuevaReserva.valorMeta) || 0,
        valorReservaSemanal: parseFloat(nuevaReserva.valorReservaSemanal) || 0,
        fechaMeta: nuevaReserva.tipo !== 'GASTO_FIJO_MES' ? nuevaReserva.fechaMeta.toISOString().split('T')[0] : null,
      };
      await api.post('/api/reservas', payload);
      setNuevaModalVisible(false);
      setNuevaReserva({ concepto: '', tipo: tiposDeReserva[0], valorMeta: '', valorReservaSemanal: '', fechaMeta: new Date() });
      triggerRefresh();
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo crear la reserva.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbonoMasivo = async () => {
    if (!abonoMasivo.nmSemanas || !abonoMasivo.concepto.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/reservas/reservas-masivas', {
        nmSemanas: parseInt(abonoMasivo.nmSemanas),
        concepto: abonoMasivo.concepto,
        tipoReserva: abonoMasivo.tipoReserva,
      });
      setMasivoModalVisible(false);
      setAbonoMasivo({ nmSemanas: '', concepto: '', tipoReserva: tiposDeReservaMasiva[0] });
      triggerRefresh();
      Alert.alert('Éxito', 'Abono masivo realizado correctamente.');
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo realizar el abono masivo.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReiniciarMes = () => {
    Alert.alert(
      "Confirmar Reinicio de Mes",
      "Esta acción creará una nueva reserva agrupada con los saldos pendientes por pagar y eliminará todos los movimientos del mes anterior. ¿Desea Continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Continuar",
          onPress: async () => {
            setLoading(true);
            try {
              await api.post('/api/reservas/reiniciar-mes');
              Alert.alert('Éxito', 'El mes se ha reiniciado correctamente.');
              triggerRefresh();
            } catch (error) {
              console.error('Error al reiniciar el mes:', error);
              Alert.alert('Error', 'No se pudo reiniciar el mes.');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  const ahorros = resumen?.reservas.filter(r => r.tipo === 'AHORRO') || [];
  const inversiones = resumen?.reservas.filter(r => r.tipo === 'INVERSION') || [];
  const gastosFijos = resumen?.reservas.filter(r => r.tipo === 'GASTO_FIJO') || [];
  const gastosFijosMes = resumen?.reservas.filter(r => r.tipo === 'GASTO_FIJO_MES') || [];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
        {resumen && (
          <View style={globalStyles.summaryContainer}>
            <View style={globalStyles.highlightSection}>
              <Text style={globalStyles.highlightTitle}>Total Reservado:</Text>
              <Text style={globalStyles.highlightValue}>{formatCurrency(resumen.totalReservado)}</Text>
            </View>

            <View style={globalStyles.summaryCard}>
              <Text style={globalStyles.cardTitle}>Presupuesto</Text>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Semanal Ahorros:</Text><Text style={globalStyles.infoValue}>{formatCurrency(resumen.pptoSemanalAhorros)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Semanal Inversiones:</Text><Text style={globalStyles.infoValue}>{formatCurrency(resumen.pptoSemanalInversiones)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Semanal Gastos Fijos:</Text><Text style={globalStyles.infoValue}>{formatCurrency(resumen.pptoSemanalGastosFijos)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Semanal Gastos Fijos Mes:</Text><Text style={globalStyles.infoValue}>{formatCurrency(resumen.pptoSemanalGFMes)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Semanal Total:</Text><Text style={[globalStyles.infoValue, {color: '#333'}]}>{formatCurrency(resumen.pptoSemanalTotal)}</Text></View>
              <View style={globalStyles.infoRow}><Text style={globalStyles.infoLabel}>Mensual Total:</Text><Text style={[globalStyles.infoValue, {color: '#333'}]}>{formatCurrency(resumen.pptoMensualTotal)}</Text></View>
            </View>

            <View style={globalStyles.topActionsContainer}>
              <TouchableOpacity style={[globalStyles.addButton, { flex: 1, marginRight: 10 }]} onPress={() => setNuevaModalVisible(true)} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={globalStyles.addButtonText}>Nueva</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.addButton, { flex: 1, backgroundColor: '#28a745', marginRight: 10 }]} onPress={() => setMasivoModalVisible(true)} activeOpacity={0.8}>
                <Ionicons name="trending-up-outline" size={22} color="#fff" />
                <Text style={globalStyles.addButtonText}>Abono Masivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.addButton, { flex: 1, backgroundColor: '#fd7e14'}]} onPress={handleReiniciarMes}>
                <Ionicons name="refresh-circle-outline" size={24} color="#fff" />
                <Text style={globalStyles.addButtonText}>Reiniciar Mes</Text>
              </TouchableOpacity>
            </View>
            
            <View style={globalStyles.summaryCard}>
              {ahorros.length > 0 && <TipoReservaAccordion title="Ahorros" totalReservado={resumen.totalReservadoAhorros} reservas={ahorros} isExpanded={expandedSections.AHORRO} onPress={() => toggleSection('AHORRO')} navigation={navigation} />}
              {inversiones.length > 0 && <TipoReservaAccordion title="Inversiones" totalReservado={resumen.totalReservadoInversiones} reservas={inversiones} isExpanded={expandedSections.INVERSION} onPress={() => toggleSection('INVERSION')} navigation={navigation} />}
              {gastosFijos.length > 0 && <TipoReservaAccordion title="Gastos Fijos" totalReservado={resumen.totalReservadoGastoFijos} reservas={gastosFijos} isExpanded={expandedSections.GASTO_FIJO} onPress={() => toggleSection('GASTO_FIJO')} navigation={navigation} />}
              {gastosFijosMes.length > 0 && <TipoReservaAccordion title="Gastos Fijos Mensuales" totalReservado={resumen.totalReservadoGFMes} reservas={gastosFijosMes} isExpanded={expandedSections.GASTO_FIJO_MES} onPress={() => toggleSection('GASTO_FIJO_MES')} navigation={navigation} />}
            </View>
          </View>
        )}
      </View>
      
      <Modal animationType="fade" transparent={true} visible={nuevaModalVisible} onRequestClose={() => setNuevaModalVisible(false)}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Agregar Nueva Reserva</Text>
            <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Concepto:</Text><TextInput style={globalStyles.input} placeholder="Ej: Viaje a la playa" value={nuevaReserva.concepto} onChangeText={(text) => handleInputChange('nueva', 'concepto', text)} /></View>
            <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Valor Meta (Opcional):</Text><TextInput style={globalStyles.input} placeholder="Ej: 2000000" value={String(nuevaReserva.valorMeta)} onChangeText={(text) => handleInputChange('nueva', 'valorMeta', text)} keyboardType="numeric" /></View>
            <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Reserva Semanal (Opcional):</Text><TextInput style={globalStyles.input} placeholder="Ej: 50000" value={String(nuevaReserva.valorReservaSemanal)} onChangeText={(text) => handleInputChange('nueva', 'valorReservaSemanal', text)} keyboardType="numeric" /></View>
            
            {nuevaReserva.tipo !== 'GASTO_FIJO_MES' && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Fecha Meta:</Text>
                <TouchableOpacity style={globalStyles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                  <Text>{nuevaReserva.fechaMeta.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={nuevaReserva.fechaMeta}
                mode="date"
                display="default"
                onChange={onChangeDate}
              />
            )}
            
            <Text style={{ marginBottom: 10, color: '#666' }}>Tipo de Reserva:</Text>
            <View style={globalStyles.typeSelectorContainer}>
              {tiposDeReserva.map((tipo) => (
                <TouchableOpacity key={tipo} style={[globalStyles.typeButton, nuevaReserva.tipo === tipo && globalStyles.typeButtonSelected]} onPress={() => handleInputChange('nueva', 'tipo', tipo)}>
                  <Text style={[globalStyles.typeButtonText, nuevaReserva.tipo === tipo && globalStyles.typeButtonTextSelected]}>{formatTipoForDisplay(tipo)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, { backgroundColor: '#6c757d', width: '48%' }]} onPress={() => setNuevaModalVisible(false)}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, { width: '48%' }]} onPress={handleAgregarReserva} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Agregar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={masivoModalVisible} onRequestClose={() => setMasivoModalVisible(false)}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Abono Masivo</Text>
            <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Número de Semanas:</Text><TextInput style={globalStyles.input} placeholder="Ej: 4" value={abonoMasivo.nmSemanas} onChangeText={(text) => handleInputChange('masivo', 'nmSemanas', text)} keyboardType="numeric" /></View>
            <View style={globalStyles.inputGroup}><Text style={globalStyles.label}>Concepto:</Text><TextInput style={globalStyles.input} placeholder="Ej: Abono quincenal" value={abonoMasivo.concepto} onChangeText={(text) => handleInputChange('masivo', 'concepto', text)} /></View>
            
            <Text style={{ marginBottom: 10, color: '#666' }}>Tipo de Reserva a Afectar:</Text>
            <View style={globalStyles.typeSelectorContainer}>
              {tiposDeReservaMasiva.map((tipo) => (
                <TouchableOpacity key={tipo} style={[globalStyles.typeButton, abonoMasivo.tipoReserva === tipo && globalStyles.typeButtonSelected]} onPress={() => handleInputChange('masivo', 'tipoReserva', tipo)}>
                  <Text style={[globalStyles.typeButtonText, abonoMasivo.tipoReserva === tipo && globalStyles.typeButtonTextSelected]}>{formatTipoForDisplay(tipo)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, { backgroundColor: '#6c757d', width: '48%' }]} onPress={() => setMasivoModalVisible(false)}><Text style={globalStyles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, { width: '48%' }]} onPress={handleAbonoMasivo} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Abonar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
