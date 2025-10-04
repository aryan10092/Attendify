
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import { getTeacherClasses, getTeacherData } from '../../utils/teacherAuth';

export default function AllClasses() {
  const router = useRouter();
  
  
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useFocusEffect(
    useCallback(() => {
      fetchClasses();
    }, [])
  );

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get teacher data first
      const teacherData = await getTeacherData();
      if (!teacherData) {
        throw new Error('Teacher not logged in');
      }
      
      // Fetch classes using the teacher authentication utility
      const teacherClasses = await getTeacherClasses(teacherData.teacherId);
      setClasses(teacherClasses);
      
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setError(error.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return 'No schedule';
    return schedule.map(s => `${s.day} ${s.time}`).join(', ');
  };

  const handleClassSelection = async (classCode: string) => {
    console.log('Selected class:', classCode);
  
    router.push({
      pathname: '/teacher/class/[classId]',
      params: { classId: classCode }
    });
  };
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center px-8">
        <View className='mt-16'>
        </View>
        
        <Text className="text-3xl font-jura-bold mb-12 mt-4">All my Classes</Text>
        
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
                onPress={fetchClasses}
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
              {classes.map((classItem, index) => (
                <TouchableOpacity
                  key={classItem.id}
                  className="border border-gray-300 rounded-lg p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50"
                  onPress={() => handleClassSelection(classItem.class_code)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View>
                      <Text className="text-xl font-jura-bold text-gray-800 mb-1">
                        {classItem.name}
                      </Text>
                      <Text className="text-lg font-jura text-blue-600 mb-2">
                        {classItem.subject}
                      </Text>
                      </View>
                      <View>
                      {/* <Text className="text-sm font-jura text-gray-600 mb-1">
                        Code: {classItem.class_code}
                      </Text> */}
                      <Text className="text-xs font-jura text-gray-500">
                        {formatSchedule(classItem.schedule)}
                      </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
          
          {/* Add Class Button */}
          <TouchableOpacity
            className="bg-black rounded-2xl py-4 mt-4 items-center mb-4"
            onPress={() => router.push('/teacher/Addclass')}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="plus" size={24} color="white" />
              <Text className="text-white text-xl font-jura-bold ml-2">Add a Class</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}