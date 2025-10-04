import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import { getTeacherData, TeacherData } from '../../utils/teacherAuth';

interface Student {
  id: string;
  student_id: string;
  name: string;
  email: string;
  roll_number: string;
  batch: string;
  created_at: string;
}

export default function AllStudents() {
  const router = useRouter();
  const { classId, className } = useLocalSearchParams<{ classId: string; className?: string }>();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  useEffect(() => {
    fetchTeacherAndStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, selectedBatch, teacherData]);

  const fetchTeacherAndStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get teacher data first
      const teacher = await getTeacherData();
      if (!teacher) {
        throw new Error('Teacher not logged in');
      }
      setTeacherData(teacher);

      // Fetch students from Supabase
      let query = supabase
        .from('students')
        .select('*')
        .order('batch', { ascending: true })
        .order('roll_number', { ascending: true });

      
      if (classId && classId !== 'Unknown') {
   
      }

      const { data, error } = await query;

      if (error) throw error;

      const studentData = data || [];
      setStudents(studentData);
      

      if (teacher.department && studentData.length > 0) {

        const relevantBatches = studentData
          .map((s: Student) => s.batch)
          .filter((batch: string, index: number, self: string[]) => self.indexOf(batch) === index)
          .filter((batch: string) => 
            teacher.department && 
            batch.toLowerCase().includes(teacher.department.toLowerCase().slice(0, 3))
          );
        
        if (relevantBatches.length > 0) {
          setSelectedBatch(relevantBatches[0]);
        }
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

   
    if ( teacherData?.subject) {

    }

    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.roll_number.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    }

    // Filter by selected batch
    if (selectedBatch) {
      filtered = filtered.filter(student => student.batch === selectedBatch);
    }

    setFilteredStudents(filtered);
  };

  const getUniqueBatches = () => {
    const batches = [...new Set(students.map(student => student.batch))];
    return batches.sort();
  };

  const getBatchColor = (batch: string) => {
    const colors = [
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-purple-100 border-purple-300',
      'bg-orange-100 border-orange-300',
      'bg-pink-100 border-pink-300',
      'bg-yellow-100 border-yellow-300'
    ];
    const index = batch.length % colors.length;
    return colors[index];
  };

  const StudentCard = ({ student }: { student: Student }) => (
    <View className={`rounded-lg p-4 mb-4 border-2 ${getBatchColor(student.batch)}`}>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-jura-bold text-gray-800">{student.name}</Text>
          <Text className="text-sm font-jura text-gray-600">Roll: {student.roll_number}</Text>
        </View>
        <View className="bg-white rounded-lg px-3 py-1 border border-gray-300">
          <Text className="text-xs font-jura-bold text-gray-700">{student.batch}</Text>
        </View>
      </View>
      
      <Text className="text-sm font-jura text-gray-600 mb-3">{student.email}</Text>
      
      <View className="flex-row justify-between items-center">
        <Text className="text-xs font-jura text-gray-500">
          Joined: {new Date(student.created_at).toLocaleDateString()}
        </Text>
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="bg-blue-500 rounded-lg px-3 py-1"
            onPress={() => {
              Alert.alert(
                'Student Details',
                `Name: ${student.name}\nRoll: ${student.roll_number}\nBatch: ${student.batch}\nEmail: ${student.email}\nJoined: ${new Date(student.created_at).toLocaleDateString()}`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text className="text-white text-xs font-jura-bold">Details</Text>
          </TouchableOpacity>
          
          {/* {classId && classId !== 'Unknown' && (
            // <TouchableOpacity
            //   className="bg-green-500 rounded-lg px-3 py-1 ml-2"
            //   onPress={() => {
            //     Alert.alert(
            //       'Add to Class',
            //       `Add ${student.name} to class ${className || classId}?`,
            //       [
            //         { text: 'Cancel', style: 'cancel' },
            //         { 
            //           text: 'Add', 
            //           onPress: () => {
            //             // Here you could implement logic to add student to class
            //             Alert.alert('Success', `${student.name} added to class!`);
            //           }
            //         }
            //       ]
            //     );
            //   }}
            // >
            //   <Text className="text-white text-xs font-jura-bold">Add to Class</Text>
            // </TouchableOpacity>
         // )} */}
        </View>
      </View>
    </View>
  );

  const BatchFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      <TouchableOpacity
        className={`mr-2 px-4 py-2 rounded-lg border ${
          selectedBatch === '' ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
        }`}
        onPress={() => setSelectedBatch('')}
      >
        <Text className={`font-jura-bold ${selectedBatch === '' ? 'text-white' : 'text-gray-700'}`}>
          All Batches
        </Text>
      </TouchableOpacity>
      
      {getUniqueBatches().map((batch) => (
        <TouchableOpacity
          key={batch}
          className={`mr-2 px-4 py-2 rounded-lg border ${
            selectedBatch === batch ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
          }`}
          onPress={() => setSelectedBatch(batch)}
        >
          <Text className={`font-jura-bold ${selectedBatch === batch ? 'text-white' : 'text-gray-700'}`}>
            {batch}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-8 pb-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          <Text className="ml-2 text-lg font-jura">Back to Class</Text>
        </TouchableOpacity>
        
        <View className="items-center mb-6">
          <MaterialCommunityIcons name="account-group" size={60} color="#000" />
          <Text className="text-2xl font-jura-bold mt-2">Students List</Text>
          {className && (
            <Text className="text-lg font-jura text-gray-600">{className}</Text>
          )}
          {teacherData && (
            <Text className="text-sm font-jura text-gray-500 mt-1">
              Teacher: {teacherData.name}
            </Text>
          )}
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 mb-4">
          <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 font-jura text-gray-700"
            placeholder="Search by name, roll number, or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Batch Filter */}
        <BatchFilter />

        {/* Stats */}
        <View className="bg-blue-50 rounded-lg p-4 mb-4">
          <View className="flex-row justify-between">
            <Text className="font-jura text-blue-800">
              Total Students: {students.length}
            </Text>
            <Text className="font-jura text-blue-800">
              Filtered: {filteredStudents.length}
            </Text>
          </View>
          <Text className="font-jura text-sm text-blue-600 mt-1">
            Batches: {getUniqueBatches().join(', ')}
          </Text>
          {teacherData?.department && (
            <Text className="font-jura text-sm text-blue-600">
              Teacher Department: {teacherData.department}
            </Text>
          )}
          {teacherData?.subject && (
            <Text className="font-jura text-sm text-blue-600">
              Subject: {teacherData.subject}
            </Text>
          )}
        </View>
      </View>

      {/* Students List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-lg font-jura text-gray-600">Loading students...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
          <Text className="mt-4 text-lg font-jura text-red-600 text-center">{error}</Text>
          <TouchableOpacity
            className="mt-4 bg-blue-500 rounded-lg py-3 px-6"
            onPress={fetchTeacherAndStudents}
          >
            <Text className="text-white font-jura-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialCommunityIcons name="account-search" size={48} color="#6b7280" />
          <Text className="mt-4 text-lg font-jura text-gray-600 text-center">
            {students.length === 0 ? 'No students found' : 'No students match your search'}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              className="mt-4 bg-gray-500 rounded-lg py-2 px-4"
              onPress={() => setSearchQuery('')}
            >
              <Text className="text-white font-jura-bold">Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pb-6">
          {filteredStudents.map((student) => (
            <StudentCard key={student.student_id} student={student} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}