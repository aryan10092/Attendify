import  { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuidv4 from 'react-native-uuid';

export default function TeacherLogin() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [institute, setInstitute] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);




  const handleLogin = async () => {
    if (!name || !email || !teacherId || !institute ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    

    setLoading(true);
    
    try {
    
      await new Promise(resolve => setTimeout(resolve, 1000));

      
      const { data: existingTeacher, error: checkError } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { 
        throw checkError;
      }

      if (existingTeacher) {
        
        Alert.alert(
          'Teacher Already Exists', 
          `A teacher with ID "${teacherId}" is already registered.\n\nName: ${existingTeacher.name}\nEmail: ${existingTeacher.email}`,
          [
            {
              text: 'Login as This Teacher',
              onPress: async () => {
               
                await AsyncStorage.setItem('teacher_name', existingTeacher.name);
                await AsyncStorage.setItem('teacher_email', existingTeacher.email);
                await AsyncStorage.setItem('teacher_id', existingTeacher.teacher_id);
                await AsyncStorage.setItem('teacher_institute', existingTeacher.institute);
              
              
                
                router.replace('/teacher/dashboard');
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

    
      const { data, error } = await supabase
        .from('teachers')
        .insert([{
          name,
          email,
          teacher_id: teacherId,
          institute,
        
          
        }]);
     
      console.log('Teacher registration response:', data, error);

      if (error) {
        if (error.code === '23505') { 
          if (error.message.includes('teacher_id')) {
            Alert.alert('Error', 'This teacher ID is already registered. Please check your teacher ID.');
          } else if (error.message.includes('email')) {
            Alert.alert('Error', 'This email is already registered. Please use a different email.');
          } else {
            Alert.alert('Error', 'This teacher information is already registered.');
          }
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

   
      await AsyncStorage.setItem('teacher_name', name);
      await AsyncStorage.setItem('teacher_email', email);
      await AsyncStorage.setItem('teacher_id', teacherId);
      await AsyncStorage.setItem('teacher_institute', institute);
      

      Alert.alert(
        'Login Successful', 
        `Welcome ${name}!`,
        [
          { 
            text: 'Continue', 
            onPress: () => router.replace('/teacher/dashboard')
          }
        ]
      );

    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Unable to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-8 py-16">
        <View className='mt-8'>
          <MaterialCommunityIcons name="account-tie" size={80} color="#000" />
        </View>
        <Text className="text-3xl font-krona mb-12 mt-4">Teacher Login</Text>
        
        <View className="w-full mb-6">
          <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Name</Text>
          <TextInput
            className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10 text-lg ${
              loading ? 'bg-gray-100' : 'bg-black/10'
            }`}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />
          
          <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Email</Text>
          <TextInput
            className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10 text-lg ${
              loading ? 'bg-gray-100' : 'bg-black/10'
            }`}
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          
          <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Teacher ID</Text>
          <TextInput
            className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10 text-lg ${
              loading ? 'bg-gray-100' : 'bg-black/10'
            }`}
            placeholder="e.g., TCR001 or T123456"
            value={teacherId}
            onChangeText={setTeacherId}
            autoCapitalize="characters"
            editable={!loading}
          />
          {/* <Text className='font-jura text-sm text-gray-500 mb-4'>
            Enter your unique teacher ID 
          </Text> */}
          
          <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Institute</Text>
          <TextInput
            className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10 text-lg ${
              loading ? 'bg-gray-100' : 'bg-black/10'
            }`}
            placeholder="Enter your institute name"
            value={institute}
            onChangeText={setInstitute}
            autoCapitalize="words"
            editable={!loading}
          />
          
          
          
          <TouchableOpacity
            className={`rounded-2xl py-4 mt-4 items-center mb-4 ${
              loading ? 'bg-gray-400' : 'bg-black'
            }`}
            onPress={handleLogin}
            disabled={loading}
          >
            <View className="flex-row items-center">
              {loading && (
                <ActivityIndicator 
                  size="small" 
                  color="white" 
                  className="mr-2" 
                />
              )}
              <Text className="text-white text-xl font-jura-bold">
                {loading ? 'Logging in...' : 'Login as Teacher'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="items-center"
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text className="text-gray-500 font-jura">Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}