
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { getTeacherClasses, getTeacherData, TeacherData } from '../../utils/teacherAuth';

export default function TeacherDashboard() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);

  useEffect(() => {
    fetchTeacherDataAndClasses();
  }, []);

  const fetchTeacherDataAndClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get teacher data first
      const teacher = await getTeacherData();
      if (!teacher) {
        throw new Error('Teacher not logged in');
      }
      
      setTeacherData(teacher);
      
      // Fetch classes using the teacher ID
      const teacherClasses = await getTeacherClasses(teacher.teacherId);
      setClasses(teacherClasses);
      
    } catch (error: any) {
      console.error('Error fetching teacher data and classes:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelection = async (classCode: string) => {
    console.log('Selected class:', classCode);

    router.push({
      pathname: '/teacher/class/[classId]',
      params: { classId: classCode }
    });

  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return 'No schedule';
    return schedule.map(s => `${s.day} ${s.time}`).join(', ');
  };

  const getUpcomingClasses = () => {
    // Get today's day
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    return classes.filter(classItem => {
      return classItem.schedule?.some((s: any) => s.day === today);
    }).slice(0, 3); // Show only first 3 upcoming classes
  };

  return (
    <ScrollView className="flex-1 bg-white">

<TouchableOpacity 
          onPress={() => router.push('/')}
          className="flex-row items-center mt-6 ml-8"
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#000" />
          
        </TouchableOpacity>
      <View className="items-center px-8">
      
        <View className='mt-2'>

          


          {teacherData && (
            <Text className="text-xl font-jura-semibold text-gray-700 mb-2">
              Welcome, {teacherData.name}!
            </Text>
          )}
        </View>
        
        <Text className="text-3xl font-jura-bold mb-8 mt-4">Upcoming Classes</Text>
      
      <LottieView
        source={require('../../assets/teacher.json')}
        style={{ width: 250, height: 250, marginBottom: 20 }}
        autoPlay
        loop
      />
      
      <View className="w-full mb-6">
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#333333" />
            <Text className="mt-4 text-lg font-jura text-gray-600">Loading classes...</Text>
          </View>
        ) : error ? (
          <View className="items-center py-8">
            <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
            <Text className="mt-4 text-lg font-jura text-red-600 text-center">{error}</Text>
            <TouchableOpacity
              className="mt-4 bg-blue-500 rounded-lg py-2 px-4"
              onPress={fetchTeacherDataAndClasses}
            >
              <Text className="text-white font-jura-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : classes.length === 0 ? (
          <View className="items-center py-8">
            <MaterialCommunityIcons name="school-outline" size={48} color="#6b7280" />
            <Text className="mt-4 text-lg font-jura text-gray-600 text-center">No classes found</Text>
            <Text className="mt-2 text-sm font-jura text-gray-500 text-center">
              Create your first class to get started
            </Text>
          </View>
        ) : (
          <>
            {/* Today's Classes */}
            {getUpcomingClasses().length > 0 && (
              <>
                <Text className="text-xl font-jura-bold mb-4 text-gray-700">Today's Classes</Text>
                {getUpcomingClasses().map((classItem, index) => (
                  <TouchableOpacity
                    key={`upcoming-${classItem.id}`}
                    className="border border-green-200 rounded-2xl p-4 mb-4 bg-green-50"
                    onPress={() => handleClassSelection(classItem.class_code)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-lg font-jura-bold text-gray-800">{classItem.name}</Text>
                        <Text className="text-sm font-jura text-gray-600">{classItem.subject}</Text>
                        <Text className="text-xs font-jura text-green-600 mt-1">
                          {classItem.schedule?.find((s: any) => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }))?.time}
                        </Text>
                      </View>
                      <View className="items-center">
                        <MaterialCommunityIcons name="clock" size={20} color="#16a34a" />
                        <Text className="text-xs font-jura text-green-600 mt-1">Today</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* All Recent Classes */}
            <Text className="text-xl font-jura-bold mb-4 mt-6 text-gray-700">Recent Classes</Text>
            {classes.slice(0, 5).map((classItem, index) => (
              <TouchableOpacity
                key={classItem.id}
                className="border border-gray-300 rounded-2xl p-4 mb-4 bg-[#333333]"
                onPress={() => handleClassSelection(classItem.class_code)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-jura-bold text-white">{classItem.name}</Text>
                    {/* <Text className="text-sm font-jura text-gray-300">{classItem.subject}</Text> */}
                    <Text className="text-xs font-jura text-gray-400 mt-1">
                      {formatSchedule(classItem.schedule)}
                    </Text>
                  </View>
                  <View className="items-center">
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#ffffff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        
        <TouchableOpacity
          className="bg-black/10 rounded-2xl py-4 mt-2 items-center mb-4"
          onPress={() => router.push('/teacher/Allclasses')}
        >
          <Text className="text-black text-xl font-jura-bold">All Classes</Text>
        </TouchableOpacity>

        
        </View>
      </View>
    </ScrollView>
  );
}
