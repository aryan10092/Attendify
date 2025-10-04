
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { requestBluetoothPermissions } from '../utils/ble';
import { isStudentLoggedIn } from '../utils/studentAuth';
import { isTeacherLoggedIn } from '../utils/teacherAuth';
// ...existing code...

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Check if student is already logged in
        const studentLoggedIn = await isStudentLoggedIn();
        
   
        const teacherLoggedIn = await isTeacherLoggedIn();
        
       
        
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoginStatus();
  }, []);

  const handleStudentPress = async () => {
    // Check if already logged in before navigating
    const studentLoggedIn = await isStudentLoggedIn();
    
    if (studentLoggedIn) {
      router.push('/student/student-dashboard');
    } else {
      router.push('/auth/student-login');
    }
  }
  const handleTeacherPress = async () => {
    // Check if already logged in before navigating
    const teacherLoggedIn = await isTeacherLoggedIn();

    if (teacherLoggedIn) {
      router.replace('/teacher/dashboard');
    } else {
      router.push('/auth/teacher-login');
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-lg text-gray-600 font-jura">Loading...</Text>
      </View>
    );
  }
  return (
  <View className="flex-1 justify-center items-center bg-white">
  <Text className="text-4xl  self-start pl-8 leading-[40px] font-krona mb-6">Attendify</Text>
  <LottieView
  source={require('../assets/home.json')}
        style={{ width: 250, height: 250 ,marginBottom:10,marginTop:6}}
        autoPlay
        loop
      />
   <Text className='text-md text-[#8C8C8C] font-jura-bold  mx-12 mb-20'>we believe taking attendence shouldn't take longer than making maggie</Text>
   
  <View className="flex-col gap-6">
     
        <TouchableOpacity
          className="bg-black flex flex-row gap-5 rounded-2xl w-80 py-4 pl-4 shadow-lg items-center "
           onPress={handleTeacherPress}
          >

          <MaterialCommunityIcons name="account-tie" size={24} color="#fff" />
          <Text className="text-white text-2xl font-jura-bold  items-center">
            I'm a Teacher</Text>

        </TouchableOpacity>
        <TouchableOpacity
          className="bg-black flex flex-row rounded-2xl  pl-4 py-4 gap-5 shadow-lg items-center w-"
          onPress={handleStudentPress}
        >
          <MaterialCommunityIcons name="account" size={24} color="#fff" />
          <Text className="text-white text-2xl font-jura-bold  items-center">
            I'm a Student</Text>
        </TouchableOpacity>

      </View>
              <Text className='text-md text-[#8C8C8C] font-jura-bold text-center mx-12 mt-8 mb-20 '>made by Aryan Gupta</Text>
    </View>
  );
}
