
// import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// import { useState, useEffect } from 'react';


// export default function ClassDetails() {
//   const router = useRouter();
//   const { classId } = useLocalSearchParams<{ classId: string }>();
  
//   const [isSessionActive, setIsSessionActive] = useState(false);
//   const [sessionData, setSessionData] = useState<{
//     sessionId: string;
//     sessionCode: string;
//     expiresAt: Date;
//   } | null>(null);
//   const [attendanceCount, setAttendanceCount] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [supabaseStatus, setSupabaseStatus] = useState<string>('checking...');

//   // Check Supabase status on component mount
 
//   return (
//     <ScrollView contentContainerClassName="flex-1 bg-white px-8">
//       <View className="mt-8 mb-8">
//         <TouchableOpacity 
//           onPress={() => router.back()}
//           className="flex-row items-center mb-4"
//         >
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//           <Text className="ml-2 text-lg font-jura">Back to Classes</Text>
//         </TouchableOpacity>
        
//         <View className="items-center mt-4">
//           <MaterialCommunityIcons name="school" size={80} color="#000" />
//           <Text className="text-3xl font-jura-bold mt-4 mb-2">Class {classId}</Text>
//           <Text className="text-lg font-jura text-gray-600 mb-8">Attendance Management</Text>
//         </View>
//       </View>

//       <View className="w-full mb-6">
//         {/* Session Status Card */}
//         <View className="bg-gray-100 rounded-lg p-6 mb-6">
//           <Text className="text-xl font-jura-bold mb-4">Session Status</Text>
//           <View className="flex-row items-center mb-2">
//             <MaterialCommunityIcons 
//               name={isSessionActive ? "wifi" : "wifi-off"} 
//               size={20} 
//               color={isSessionActive ? "#22c55e" : "#ef4444"} 
//             />
//             <Text className="ml-2 font-jura">
//               {isSessionActive ? "Active" : "Inactive"}
//             </Text>
//           </View>
          
//           {isSessionActive && sessionData && (
//             <>
//               <Text className="font-jura text-sm text-gray-600 mb-2">
//                 Session Code: {sessionData.sessionCode}
//               </Text>
//               <Text className="font-jura text-sm text-gray-600 mb-2">
//                 Students Present: {attendanceCount}
//               </Text>
//               <Text className="font-jura text-sm text-gray-600 mb-2">
//                 Expires: {sessionData.expiresAt.toLocaleTimeString()}
//               </Text>
//               <Text className="font-jura text-xs text-blue-600">
//                 📡 BLE Broadcasting Active • Auto-refreshing every 5s
//               </Text>
//             </>
//           )}
//         </View>

//         {/* Action Buttons */}
//         {!isSessionActive ? (
//           <TouchableOpacity
//             className={`rounded-2xl py-4 items-center mb-4 bg-black/10 border }`}
//            // onPress={startSession}
//             disabled={isLoading}
//           >
//             <Text className="text-black text-xl font-jura-bold">
//               {isLoading ? 'Starting Session...' : 'Take Attendance'}
//             </Text>
//           </TouchableOpacity>
//         ) : (
//           <>
//             <TouchableOpacity
//               className="bg-blue-600 rounded-2xl py-4 items-center mb-4"
//              // onPress={getAttendanceCount}
//             >
//               <Text className="text-white text-xl font-jura-bold">Refresh Count</Text>
//             </TouchableOpacity>
            
//             <TouchableOpacity
//               className="bg-red-600 rounded-2xl py-4 items-center mb-4"
//              // onPress={stopSession}
//             >
//               <Text className="text-white text-xl font-jura-bold">Stop Session</Text>
//             </TouchableOpacity>
//           </>
//         )}

//         {/* Additional Actions */}
//         <TouchableOpacity
//           className="border border-gray-300 bg-[#333333] rounded-2xl py-4 items-center mb-4"
//           onPress={() => {
           
//             console.log(`View students history for ${classId}`);
//           }}
//         >
//           <Text className="text-white text-lg font-jura-bold"> Students</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           className="border border-gray-300 bg-[#333333] rounded-2xl py-4 items-center mb-4"
//           onPress={() => {
        
//           }}
//         >
//           <Text className="text-white text-lg font-jura-bold">Download Report</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// }








import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {students} from '../../../data/student';
import { 
  startAttendanceSession, 
  getAttendanceStats,
  cleanupExpiredSessions,
  stopBLEAdvertising
} from '../../../utils/ble';
import { supabase } from '../../../lib/supabase';


export default function ClassDetails() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const currentClassId = classId || 'Unknown';
  
  // Class data from Supabase
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    sessionCode: string;
    expiresAt: Date;
  } | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    totalAttendees: 0,
    attendees: []
  });
  const presentCount = students.filter(s => s.present).length;

  // Fetch class details from Supabase
  useEffect(() => {
    fetchClassDetails();
  }, [currentClassId]);

  const fetchClassDetails = async () => {
    if (!currentClassId || currentClassId === 'Unknown') return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('class_code', currentClassId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      setClassData(data);
    } catch (error: any) {
      console.error('Error fetching class details:', error);
      setError(error.message || 'Failed to fetch class details');
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return 'No schedule';
    return schedule.map(s => `${s.day} at ${s.time}`).join(', ');
  };

  // Clean up expired sessions on component mount
  useEffect(() => {
    cleanupExpiredSessions( );
  }, []);

  // Update attendance stats periodically when session is active
  useEffect(() => {
    let interval: any;
    
    if (isSessionActive && sessionData) {
      const updateStats = async () => {
        try {
          const stats = await getAttendanceStats(sessionData.sessionId, supabase);
          setAttendanceStats(stats);
          setAttendanceCount(stats.totalAttendees);
        } catch (error) {
          console.error('Error updating attendance stats:', error);
        }
      };
      
      updateStats(); // Initial update
      interval = setInterval(updateStats, 5000); // Update every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, sessionData]);

  const handleStartSession = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await startAttendanceSession(currentClassId);
      setSessionData(result);
      setIsSessionActive(true);
      
      Alert.alert(
        'Session Started',
        `Attendance session is now active!\n\nSession Code: ${result.sessionCode}\nExpires: ${result.expiresAt.toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start attendance session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (sessionData) {
        await stopBLEAdvertising(sessionData.sessionCode);
      }
      setSessionData(null);
      setIsSessionActive(false);
      setAttendanceStats({ totalAttendees: 0, attendees: [] });
      setAttendanceCount(0);
      
      Alert.alert('Session Stopped', 'Attendance session has been deactivated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop attendance session');
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!sessionData) return '';
    
    const now = new Date();
    const expiresAt = sessionData.expiresAt;
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-8 mt-8 mb-8">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          <Text className="ml-2 text-lg font-jura">Back to Classes</Text>
        </TouchableOpacity>
        
        {loading ? (
          <View className="items-center mt-8">
            <MaterialCommunityIcons name="loading" size={48} color="#6b7280" />
            <Text className="mt-4 text-lg font-jura text-gray-600">Loading class details...</Text>
          </View>
        ) : error ? (
          <View className="items-center mt-8">
            <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
            <Text className="mt-4 text-lg font-jura text-red-600 text-center">{error}</Text>
            <TouchableOpacity
              className="mt-4 bg-blue-500 rounded-lg py-2 px-4"
              onPress={fetchClassDetails}
            >
              <Text className="text-white font-jura-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : classData ? (
          <>
            <View className="items-center mt-4">
              <MaterialCommunityIcons name="school" size={80} color="#000" />
              <Text className="text-3xl font-jura-bold mt-4 mb-2">{classData.name}</Text>
              <Text className="text-xl font-jura text-gray-600 mb-2">{classData.subject}</Text>
              <Text className="text-sm font-jura text-gray-500 mb-8">Code: {classData.class_code}</Text>
            </View>

            {/* Class Schedule Card */}
            <View className="bg-blue-50 rounded-lg p-6 mb-6">
              <Text className="text-xl font-jura-bold mb-4 text-blue-800">Class Schedule</Text>
              <Text className="font-jura text-blue-700">{formatSchedule(classData.schedule)}</Text>
              <Text className="font-jura text-sm text-blue-600 mt-2">
                Created: {new Date(classData.created_at).toLocaleDateString()}
              </Text>
            </View>
          </>
        ) : (
          <View className="items-center mt-8">
            <MaterialCommunityIcons name="school-outline" size={48} color="#6b7280" />
            <Text className="mt-4 text-lg font-jura text-gray-600 text-center">Class not found</Text>
            <Text className="mt-2 text-sm font-jura text-gray-500 text-center">
              The class code "{currentClassId}" does not exist or is inactive
            </Text>
          </View>
        )}

        {/* Action Buttons - Only show if class data exists */}
        {classData && (
          <View className="w-full mb-6">
            <TouchableOpacity
              className="rounded-2xl py-4 items-center mb-4 bg-green-600"
              onPress={() => {
                router.push({
                  pathname: '/teacher/[PresentStudents]',
                  params: { PresentStudents: currentClassId }
                });
              }}
            >
              <Text className="text-white text-xl font-jura-bold">
                Take Attendance
              </Text>
            </TouchableOpacity>

            {/* Additional Actions */}
            <TouchableOpacity
              className="border border-gray-300 bg-[#333333] rounded-2xl py-4 items-center mb-4"
              onPress={() => {
                router.push({
                  pathname: '/student/Allstudents',
                  params: { classId: currentClassId, className: classData.name }
                });
              }}
            >
              <Text className="text-white text-lg font-jura-bold">View Students</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              className="border border-gray-300 bg-[#333333] rounded-2xl py-4 items-center mb-4"
              onPress={() => {
                console.log(`Download report for ${currentClassId}`);
              }}
            >
              <Text className="text-white text-lg font-jura-bold">Download Report</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              className="border border-gray-300 bg-blue-600 rounded-2xl py-4 items-center mb-4"
              onPress={() => {
                console.log(`Modify class details for ${currentClassId}`);
                router.push({
                  pathname: '/teacher/EditClass',   
                  params: { classId: currentClassId }
                });
              }}
            >
              <Text className="text-white text-lg font-jura-bold">Modify Class Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
