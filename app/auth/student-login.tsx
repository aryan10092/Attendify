import  { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuidv4 from 'react-native-uuid';
import { BottomSheet, useBottomSheet } from '../../components/ui/bottom-sheet';
import LottieView from 'lottie-react-native';

export default function StudentLogin() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [batch, setBatch] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Bottom sheet states
  const skillsSheet = useBottomSheet();
  const interestsSheet = useBottomSheet();
  const careerGoalsSheet = useBottomSheet();
  
  // Selection states
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [selectedCareerGoal, setSelectedCareerGoal] = useState('');

  // Data arrays
  const skills = [
    'Programming',
    'Data Analysis',
    'Web Development',
    'Mobile Development',
    'Machine Learning',
    'Cybersecurity',
    'UI/UX Design'
  ];

  const interests = [
    'Technology',
    'Artificial Intelligence',
    'Entrepreneurship',
    'Research',
    'Gaming',
    'Sports',
    'Music'
  ];

  const careerGoals = [
    'Software Engineer',
    'Data Scientist',
    'Product Manager',
    'Startup Founder',
    'Research Scientist',
    'Consultant',
    'Tech Lead'
  ];

  const getStudentId = async (): Promise<string> => {
  try {
  
    let studentId = await AsyncStorage.getItem('student_id');
    
    if (!studentId) {
      
      studentId = `student-${uuidv4.v4()}`;
      await AsyncStorage.setItem('student_id', studentId);
      console.log('Generated new student ID:', studentId);
    } else {
      console.log('Using existing student ID:', studentId);
    }
    
    return studentId;
  } catch (error) {
    console.error('Error getting student ID:', error);
    
    return `student-${uuidv4.v4()}`;
  }
};

  const normalizeBatch = (batch: string): string => {
    return batch.replace(/\s+/g, '').toUpperCase();
  };

  const handleLogin = async () => {
    if (!name || !email || !rollNumber || !batch) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    
    try {
      
      await new Promise(resolve => setTimeout(resolve, 1000));

   
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('roll_number', rollNumber)
        .single();

      console.log('Existing student check:', existingStudent, checkError);

      if (existingStudent) {
        
        const normalizedInputBatch = normalizeBatch(batch);
        const normalizedExistingBatch = normalizeBatch(existingStudent.batch);
        
        if (existingStudent.name === name && normalizedExistingBatch === normalizedInputBatch) {
          
          await AsyncStorage.setItem('student_name', name);
          await AsyncStorage.setItem('student_email', email);
          await AsyncStorage.setItem('student_roll', rollNumber);
          await AsyncStorage.setItem('student_batch', batch);
          await AsyncStorage.setItem('student_id', existingStudent.student_id);

          Alert.alert(
            'Login Successful', 
            `Welcome back, ${name}!`,
            [
              { 
                text: 'Continue', 
                onPress: () => router.replace('/student/student-dashboard')
              }
            ]
          );
          return;
        } else {
          
          Alert.alert(
            'Error', 
            'A student with this email and roll number exists but the name or batch doesn\'t match. Please check your details.'
          );
          return;
        }
      }

 
      const studentId = await getStudentId();

      const { data, error } = await supabase
        .from('students')
        .insert([{
          name,
          email,
          student_id: studentId,
          roll_number: rollNumber,
          batch,
          skills: selectedSkill,
          interests: selectedInterest,
          career: selectedCareerGoal
        }]);
     
      console.log('Student registration response:', data, error);

      if (error) {
        if (error.code === '23505') { 
          if (error.message.includes('roll_number')) {
            Alert.alert('Error', 'This roll number is already registered with different details. Please check your information.');
          } else if (error.message.includes('email')) {
            Alert.alert('Error', 'This email is already registered with different details. Please check your information.');
          } else {
            Alert.alert('Error', 'This student information conflicts with existing data.');
          }
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      await AsyncStorage.setItem('student_name', name);
      await AsyncStorage.setItem('student_email', email);
      await AsyncStorage.setItem('student_roll', rollNumber);
      await AsyncStorage.setItem('student_batch', batch);

      Alert.alert(
        'Registration Successful', 
        `Welcome ${name}! Your account has been created.`,
        [
          { 
            text: 'Continue', 
            onPress: () => router.replace('/student/student-dashboard')
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

  const renderSelectionSheet = (
    title: string,
    items: string[],
    selectedItem: string,
    onSelect: (item: string) => void,
    onClose: () => void
  ) => (
    <View>
      <View className='flex-row flex-wrap gap-2'>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          className={`p-2  rounded-lg border ${
            selectedItem === item 
              ? 'bg-black border-black' 
              : 'bg-gray-100 border-gray-300'
          }`}
          onPress={() => {
            onSelect(item);
            onClose();
          }}
        >
          <Text className={`font-jura text-center ${
            selectedItem === item ? 'text-white' : 'text-black'
          }`}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-8 py-16">
          <View className='mt-8'>
          <Text className="text-3xl font-krona  w-full mb-12 mt-4">Student Login</Text>
          <LottieView
  source={require('../../assets/Student.json')}
        style={{ width: 250, height: 250 ,marginBottom:40}}
        autoPlay
        loop

      />
          </View>
          
          <View className="w-full mb-6">

            <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Name</Text>
            <TextInput
              className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10`}

              placeholder="Enter your Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              editable={!loading}
            />

            <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Email</Text>
            <TextInput
              className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10`}

              placeholder="Enter your Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            
            <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Roll Number</Text>
            <TextInput
              className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10`}

              placeholder="Enter your Roll Number"
              value={rollNumber}
              onChangeText={setRollNumber}
              autoCapitalize="none"
              editable={!loading}
            />
            
            <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]'>Batch</Text>
            <TextInput
              className={`border border-gray-300 rounded-lg p-4 mb-6 font-jura bg-black/10`}

              placeholder="e.g., CST 123"
              value={batch}
              onChangeText={setBatch}
              editable={!loading}
              autoCapitalize="words"
            />

            {/* Skills Button */}
            <TouchableOpacity
              className="border border-gray-300 rounded-lg flex-row justify-between items-center p-4 mb-4 bg-white"
              onPress={skillsSheet.open}
              disabled={loading}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="code-tags" size={24} color="#000" />
                <View className="ml-3">
                  <Text className='font-jura-bold text-xl text-black'>Skills</Text>
                  <Text className="font-jura text-black/70">
                    {selectedSkill || 'Select your primary skill'}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>

            {/* Interests Button */}
            <TouchableOpacity
              className="border border-gray-300 rounded-lg flex-row justify-between items-center p-4 mb-4 bg-white"
              onPress={interestsSheet.open}
              disabled={loading}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="heart" size={24} color="#000" />
                <View className="ml-3">
                  <Text className='font-jura-bold text-xl text-black'>Interests</Text>
                  <Text className="font-jura text-black/70">
                    {selectedInterest || 'Select your main interest'}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>

            {/* Career Goals Button */}
            <TouchableOpacity
              className="border border-gray-300 rounded-lg flex-row justify-between items-center p-4 mb-6 bg-white"
              onPress={careerGoalsSheet.open}
              disabled={loading}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="target" size={24} color="#000" />
                <View className="ml-3">
                  <Text className='font-jura-bold text-xl text-black'>Career Goals</Text>
                  <Text className="font-jura text-black/70">
                    {selectedCareerGoal || 'Select your career goal'}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
            
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
                  {loading ? 'Logging in...' : 'Login as Student'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="items-center"
              onPress={() => router.back()}
            >
              <Text className="text-gray-500 font-jura">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Skills Bottom Sheet */}
      <BottomSheet
        isVisible={skillsSheet.isVisible}
        onClose={skillsSheet.close}
        title="Select Your Primary Skill"
      >
        {renderSelectionSheet(
          'Choose a Skill',
          skills,
          selectedSkill,
          setSelectedSkill,
          skillsSheet.close
        )}
      </BottomSheet>

      {/* Interests Bottom Sheet */}
      <BottomSheet
        isVisible={interestsSheet.isVisible}
        onClose={interestsSheet.close}
        title="Select Your Main Interest"
      >
        {renderSelectionSheet(
          'Choose an Interest',
          interests,
          selectedInterest,
          setSelectedInterest,
          interestsSheet.close
        )}
      </BottomSheet>

      {/* Career Goals Bottom Sheet */}
      <BottomSheet
        isVisible={careerGoalsSheet.isVisible}
        onClose={careerGoalsSheet.close}
        title="Select Your Career Goal"
      >
        {renderSelectionSheet(
          'Choose a Career Goal',
          careerGoals,
          selectedCareerGoal,
          setSelectedCareerGoal,
          careerGoalsSheet.close
        )}
      </BottomSheet>
    </>
  );
}