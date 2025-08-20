import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StackedBarChart } from 'react-native-chart-kit';
import api from '../api/api';
import { useData } from '../context/DataContext';
import { globalStyles } from '../styles/globalStyles';

const screenWidth = Dimensions.get('window').width;
const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$ 0';
  return `$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

// Componente para la nueva leyenda detallada
const ChartLegend = ({ viewType, resumen, navigation }) => {
  const pptoData = viewType === 'semanal' ? resumen?.pptoSemanal : resumen?.pptoMensual;
  const configData = resumen?.config;

  const realValues = [ pptoData?.gastos?.valor || 0, pptoData?.ahorros?.valor || 0, pptoData?.inversiones?.valor || 0, pptoData?.disponible?.valor || 0 ];
  const metaValues = (viewType === 'semanal')
    ? [ configData?.gastos?.valor || 0, configData?.ahorros?.valor || 0, configData?.inversiones?.valor || 0, configData?.libre?.valor || 0 ]
    : [ (configData?.gastos?.valor || 0) * 4, (configData?.ahorros?.valor || 0) * 4, (configData?.inversiones?.valor || 0) * 4, (configData?.libre?.valor || 0) * 4 ];
  const labels = ["Gastos", "Ahorros", "Inversión", "Libre"];
  const reservas = [pptoData?.detalleGastos, pptoData?.detalleAhorros, pptoData?.detalleInversiones, []];

  return (
    <View style={globalStyles.chartLegendContainer}>
      {labels.map((label, index) => {
        const real = realValues[index];
        const meta = metaValues[index];
        const diff = meta - real;
        return (
          <TouchableOpacity 
            key={label} 
            style={globalStyles.chartLegendItem} 
            onPress={() => navigation.navigate('PresupuestoCategoria', { 
              title: label, 
              totalReal: real, 
              totalSugerido: meta,
              diferencia: diff,
              reservas: reservas[index] 
            })}
          >
            <Text style={globalStyles.legendLabel}>{label}</Text>
            <View style={globalStyles.legendValueContainer}>
              <View>
                <Text style={globalStyles.legendValue}>{formatCurrency(real)}</Text>
                {diff >= 0 ? (
                  <Text style={[globalStyles.legendSubValue, { color: '#6c757d' }]}>Faltante Sugerido: {formatCurrency(diff)}</Text>
                ) : (
                  <Text style={[globalStyles.legendSubValue, { color: '#dc3545' }]}>Exceso: {formatCurrency(Math.abs(diff))}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward-outline" size={22} color="#ccc" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function PresupuestoScreen({ navigation }) {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('semanal');
  const { refreshKey, triggerRefresh } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartData, setChartData] = useState({ labels: [], legend: [], data: [], barColors: [] });
  const [isInitialConfig, setIsInitialConfig] = useState(false);

  const [configForm, setConfigForm] = useState({
    ingresoSemanal: '',
    gastos: '60',
    ahorros: '20',
    inversiones: '10',
    libre: '10',
  });

  const fetchPresupuesto = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/presupuesto/resumen');
      setResumen(response.data);
      const config = response.data.config;
      if (config && config.ingresoSemanal > 0) {
        setConfigForm({
          ingresoSemanal: String(config.ingresoSemanal),
          gastos: String(config.gastos.porcentaje),
          ahorros: String(config.ahorros.porcentaje),
          inversiones: String(config.inversiones.porcentaje),
          libre: String(config.libre.porcentaje),
        });
      } else {
        setIsInitialConfig(true);
        setModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el resumen del presupuesto.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPresupuesto(); }, [refreshKey]));

  useEffect(() => {
    if (resumen) {
      const pptoData = viewType === 'semanal' ? resumen.pptoSemanal : resumen.pptoMensual;
      const configData = resumen.config;
      const ingresoTotal = viewType === 'semanal' ? configData?.ingresoSemanal : configData?.ingresosMensuales;

      if (ingresoTotal > 0) {
        const realPercentages = [
          pptoData?.gastos?.porcentaje || 0,
          pptoData?.ahorros?.porcentaje || 0,
          pptoData?.inversiones?.porcentaje || 0,
          pptoData?.disponible?.porcentaje || 0,
        ];
        const metaPercentages = [
          configData?.gastos?.porcentaje || 0,
          configData?.ahorros?.porcentaje || 0,
          configData?.inversiones?.porcentaje || 0,
          configData?.libre?.porcentaje || 0,
        ];

        const realCumplido = realPercentages.map((real, index) => Math.min(real, metaPercentages[index]));
        const faltanteSugerido = realPercentages.map((real, index) => {
          const meta = metaPercentages[index];
          return meta > real ? meta - real : 0;
        });
        const excesoReal = realPercentages.map((real, index) => {
          const meta = metaPercentages[index];
          return real > meta ? real - meta : 0;
        });
        
        const newStackedBarData = {
          labels: ["Gastos", "Ahorros", "Inversión", "Libre"],
          legend: ["Real", "Faltante Sugerido", "Exceso"],
          data: realCumplido.map((value, index) => [value, faltanteSugerido[index], excesoReal[index]]),
          barColors: ["#007bff", "#e9ecef", "#dc3545"]
        };
        setChartData(newStackedBarData);
      }
    }
  }, [resumen, viewType]);

  const handleConfigChange = (name, value) => {
    setConfigForm(prev => {
        const updatedConfig = { ...prev, [name]: value };
        if (name !== 'libre' && name !== 'ingresoSemanal') {
            const gastos = parseInt(updatedConfig.gastos, 10) || 0;
            const ahorros = parseInt(updatedConfig.ahorros, 10) || 0;
            const inversiones = parseInt(updatedConfig.inversiones, 10) || 0;
            const libre = 100 - gastos - ahorros - inversiones;
            updatedConfig.libre = String(libre);
        }
        return updatedConfig;
    });
  };

  const handleGuardarConfig = async () => {
    const { ingresoSemanal, gastos, ahorros, inversiones, libre } = configForm;
    
    const numGastos = parseInt(gastos, 10);
    const numAhorros = parseInt(ahorros, 10);
    const numInversiones = parseInt(inversiones, 10);
    const numLibre = parseInt(libre, 10);

    if (!ingresoSemanal || parseFloat(ingresoSemanal) <= 0) {
      Alert.alert('Error', 'Por favor, ingresa un valor válido para tu ingreso semanal.');
      return;
    }
    
    if (numGastos < 0 || numAhorros < 0 || numInversiones < 0 || numLibre < 0) {
      Alert.alert('Error', 'Los porcentajes no pueden ser negativos.');
      return;
    }

    const totalPercentage = numGastos + numAhorros + numInversiones + numLibre;
    if (totalPercentage !== 100) {
      Alert.alert('Error', `La suma de los porcentajes debe ser 100, actualmente es ${totalPercentage}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/presupuesto/config', {
        ingresoSemanal: parseFloat(ingresoSemanal),
        gastos: numGastos,
        ahorros: numAhorros,
        inversiones: numInversiones,
        libre: numLibre,
      });
      setModalVisible(false);
      triggerRefresh();
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo guardar la configuración.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancelConfig = () => {
    if (isInitialConfig) {
      navigation.goBack();
    } else {
      setModalVisible(false);
    }
  };

  if (loading) {
    return <View style={globalStyles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
  }
  
  const ingresoTotal = viewType === 'semanal' ? resumen?.config?.ingresoSemanal : resumen?.config?.ingresosMensuales;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
        <View style={globalStyles.toggleContainer}>
          <TouchableOpacity 
            style={[globalStyles.toggleButton, viewType === 'semanal' && globalStyles.toggleButtonActive]}
            onPress={() => setViewType('semanal')}
          >
            <Text style={[globalStyles.toggleButtonText, viewType === 'semanal' && globalStyles.toggleButtonTextActive]}>Semanal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[globalStyles.toggleButton, viewType === 'mensual' && globalStyles.toggleButtonActive]}
            onPress={() => setViewType('mensual')}
          >
            <Text style={[globalStyles.toggleButtonText, viewType === 'mensual' && globalStyles.toggleButtonTextActive]}>Mensual</Text>
          </TouchableOpacity>
        </View>

        {resumen && (
          <>
            <View style={globalStyles.summaryCard}>
              <View style={styles.cardHeader}>
                <Text style={globalStyles.cardTitle}>Presupuesto {viewType === 'semanal' ? 'Semanal' : 'Mensual'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                  <Ionicons name="settings-outline" size={24} color="#007bff" />
                </TouchableOpacity>
              </View>
              <View style={globalStyles.legendContainer}>
                <View style={globalStyles.legendItem}><View style={[globalStyles.legendColor, {backgroundColor: '#007bff'}]} /><Text>Real</Text></View>
                <View style={globalStyles.legendItem}><View style={[globalStyles.legendColor, {backgroundColor: '#e9ecef'}]} /><Text>Faltante Sugerido</Text></View>
                <View style={globalStyles.legendItem}><View style={[globalStyles.legendColor, {backgroundColor: '#dc3545'}]} /><Text>Exceso</Text></View>
              </View>
              <Text style={{textAlign: 'center', marginBottom: 10, color: '#666'}}>Ingreso Total: {formatCurrency(ingresoTotal)}</Text>
              <StackedBarChart
                key={viewType}
                data={chartData}
                width={screenWidth - 60}
                height={250}
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  segments: 5,
                }}
                hideLegend={true}
              />
              <ChartLegend viewType={viewType} resumen={resumen} navigation={navigation} />
            </View>
          </>
        )}
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalView}>
            <Text style={globalStyles.modalTitle}>Configurar Presupuesto</Text>
            <Text style={{textAlign: 'center', marginBottom: 20}}>{isInitialConfig ? 'Para continuar, define tu presupuesto.' : 'Actualiza tu presupuesto.'}</Text>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Ingreso Semanal:</Text>
              <TextInput style={globalStyles.input} placeholder="Ej: 500000" value={configForm.ingresoSemanal} onChangeText={(text) => handleConfigChange('ingresoSemanal', text)} keyboardType="numeric" />
            </View>
            <View style={globalStyles.cardsRow}>
              <View style={[globalStyles.inputGroup, {width: '48%'}]}><Text style={globalStyles.label}>Gastos (%):</Text><TextInput style={globalStyles.input} value={configForm.gastos} onChangeText={(text) => handleConfigChange('gastos', text)} keyboardType="numeric" /></View>
              <View style={[globalStyles.inputGroup, {width: '48%'}]}><Text style={globalStyles.label}>Ahorros (%):</Text><TextInput style={globalStyles.input} value={configForm.ahorros} onChangeText={(text) => handleConfigChange('ahorros', text)} keyboardType="numeric" /></View>
            </View>
            <View style={globalStyles.cardsRow}>
              <View style={[globalStyles.inputGroup, {width: '48%'}]}><Text style={globalStyles.label}>Inversiones (%):</Text><TextInput style={globalStyles.input} value={configForm.inversiones} onChangeText={(text) => handleConfigChange('inversiones', text)} keyboardType="numeric" /></View>
              <View style={[globalStyles.inputGroup, {width: '48%'}]}><Text style={globalStyles.label}>Libre (%):</Text><TextInput style={globalStyles.input} value={configForm.libre} editable={false} /></View>
            </View>
            <View style={globalStyles.modalActions}>
              <TouchableOpacity style={[globalStyles.button, {backgroundColor: '#6c757d', width: '48%'}]} onPress={handleCancelConfig}>
                <Text style={globalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.button, {width: '48%'}]} onPress={handleGuardarConfig} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={globalStyles.buttonText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  }
});
