import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TextInput, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconButton } from 'react-native-paper';
import COLORS from '../constants/colors';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { TextInputMask } from 'react-native-masked-text';
import { LineChart } from 'react-native-chart-kit';
import Button from '../components/Button';

const getImcClassification = (imc) => {
  if (imc < 14) return { label: 'Abaixo do peso', color: 'blue' };
  if (imc < 18) return { label: 'Saudável', color: 'green' };
  if (imc < 20) return { label: 'Sobrepeso', color: 'orange' };
  return { label: 'Obesidade', color: 'red' };
};

const Nutricao = () => {
  const [submittedData, setSubmittedData] = useState([]);
  const [editIndex, setEditIndex] = useState(-1);
  const [touchedFields, setTouchedFields] = useState({});
  const [childrenList, setChildrenList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Buscar crianças cadastradas do AsyncStorage
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const storedChildren = await AsyncStorage.getItem('user_data');
        if (storedChildren) {
          setChildrenList(JSON.parse(storedChildren));
        }
      } catch (error) {
        console.error('Erro ao buscar crianças:', error);
      }
    };
    
    fetchChildren();
    
    // Buscar dados nutricionais existentes
    const fetchNutritionData = async () => {
      const stored = await AsyncStorage.getItem('child_data');
      if (stored) setSubmittedData(JSON.parse(stored));
    };
    fetchNutritionData();
  }, []);

  const handleFieldFocus = (field) => setTouchedFields({ ...touchedFields, [field]: false });
  const handleFieldBlur = (field) => setTouchedFields({ ...touchedFields, [field]: true });

  const validationSchema = yup.object().shape({
    nome: yup.string().required('Campo obrigatório'),
    peso: yup.string().required('Campo obrigatório'),
    altura: yup.string().required('Campo obrigatório'),
  });

  const formik = useFormik({
    initialValues: { nome: '', peso: '', altura: '' },
    validationSchema,
    onSubmit: handleSubmit,
  });

  async function handleSubmit(values) {
    try {
      const newData = [...submittedData];
      if (editIndex !== -1) newData[editIndex] = values;
      else newData.push(values);

      await AsyncStorage.setItem('child_data', JSON.stringify(newData));
      setSubmittedData(newData);
      setEditIndex(-1);
      formik.resetForm();
    } catch (e) {
      console.error('Erro ao salvar', e);
    }
  }

  const handleEdit = (index) => {
    formik.setValues(submittedData[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    const newData = submittedData.filter((_, i) => i !== index);
    await AsyncStorage.setItem('child_data', JSON.stringify(newData));
    setSubmittedData(newData);
  };

  const selectChild = (child) => {
    formik.setFieldValue('nome', child.responsibleName);
    setModalVisible(false);
  };

  const imcData = submittedData.map(({ peso, altura }) => {
    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);
    const imc = pesoNum / (alturaNum * alturaNum);
    return imc.toFixed(2);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Cadastro Nutricional</Text>

        <Text style={styles.label}>Nome:</Text>
        <TouchableOpacity 
          style={styles.input} 
          onPress={() => setModalVisible(true)}
        >
          <Text>{formik.values.nome || 'Selecione uma criança'}</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecione uma criança</Text>
              {childrenList.map((child, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.childItem}
                  onPress={() => selectChild(child)}
                >
                  <Text>{child.responsibleName}</Text>
                </TouchableOpacity>
              ))}
              <Button 
                title="Fechar" 
                onPress={() => setModalVisible(false)}
                style={{ marginTop: 20 }}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Peso (kg):</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '99.99' }}
          style={styles.input}
          placeholder="Ex: 25.3"
          keyboardType="numeric"
          value={formik.values.peso}
          onChangeText={formik.handleChange('peso')}
        />

        <Text style={styles.label}>Altura (m):</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '9.99' }}
          style={styles.input}
          placeholder="Ex: 1.30"
          keyboardType="numeric"
          value={formik.values.altura}
          onChangeText={formik.handleChange('altura')}
        />

        <Button title={editIndex !== -1 ? 'Atualizar' : 'Cadastrar'} filled onPress={formik.handleSubmit} />

        <Text style={styles.sectionTitle}>Crianças Cadastradas:</Text>
        {submittedData.map((data, index) => {
          const pesoNum = parseFloat(data.peso);
          const alturaNum = parseFloat(data.altura);
          const imc = pesoNum / (alturaNum * alturaNum);
          const classificacao = getImcClassification(imc);

          return (
            <View key={index} style={styles.card}>
              <Text style={styles.cardTitle}>{data.nome}</Text>
              <Text>Peso: {data.peso} kg</Text>
              <Text>Altura: {data.altura} m</Text>
              <Text style={{ color: classificacao.color }}>
                IMC: {imc.toFixed(2)} - {classificacao.label}
              </Text>
              <View style={styles.cardButtons}>
                <IconButton icon="pencil" onPress={() => handleEdit(index)} style={{ backgroundColor: '#ccc' }} />
                <IconButton icon="delete" onPress={() => handleDelete(index)} style={{ backgroundColor: 'red' }} />
              </View>
            </View>
          );
        })}

        {imcData.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Gráfico de IMC</Text>
            <LineChart
              data={{
                labels: submittedData.map((data, i) => data.nome || `#${i + 1}`),
                datasets: [{ data: imcData.map(Number) }],
              }}
              width={Dimensions.get('window').width - 30}
              height={220}
              chartConfig={{
                backgroundColor: '#f0f0f0',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: () => COLORS.primary,
                labelColor: () => COLORS.black,
              }}
              style={{ marginVertical: 20, borderRadius: 16 }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '500', marginTop: 10 },
  input: {
    height: 48,
    borderColor: COLORS.grey,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    color: COLORS.black,
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
  card: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardButtons: { flexDirection: 'row', marginTop: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  childItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default Nutricao;