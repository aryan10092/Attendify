

import  { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { submitAttendance, stopScan, scanForAttendanceSessions } from '../../utils/ble';
import { subjects } from '../../data/subjects';
import { 
  getStudentData, 
  logoutStudent, 
  refreshStudentData, 
  isStudentLoggedIn,
  StudentData 
} from '../../utils/studentAuth';

export default function StudentDashboard() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [foundSession, setFoundSession] = useState<{
    code: string;
    device: any;
    isValid: boolean;
  } | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [scanTimeout, setScanTimeout] = useState<any>(null);
  const [student, setStudent] = useState<{
    name: string;
    rollNo: string;
    batch: string;
    email: string;
    id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const lottieRef = useRef<LottieView>(null);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // chl rha h km chalau

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        // Check if student is logged in
        const studentId = await AsyncStorage.getItem('student_id');
        if (!studentId) {
          Alert.alert(
            'Not Logged In',
            'Please login to continue',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/auth/student-login')
              }
            ]
          );
          return;
        }

        const studentData = await getStudentData();
        setStudent(studentData);
        console.log('Student loaded:', studentData);
      } catch (error) {
        console.error('Error loading student data:', error);
        // Fallback student data
        setStudent({
          name: 'Student',
          rollNo: 'Unknown',
          batch: 'Not Set',
          email: 'unknown@example.com',
          id: `student-${Date.now()}`
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadStudentData();
  }, []);

  useEffect(() => {
    opacity.value = withTiming(scanning ? 0.8 : 1, { duration: 300 });
    scale.value = withTiming(scanning ? 0.9 : 1.1, { duration: 300 }); 
  }, [scanning]);

  useEffect(() => {
    return () => {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      stopScan();
    };
  }, [scanTimeout]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],  
    };
  });

  const handleScan = async () => {
    if (scanning) return;
    
    setScanning(true);
    setAttendanceStatus(null);
    setFoundSession(null);
    
    try {
      await scanForAttendanceSessions(
        (sessionData: { code: string; device: any; isValid: boolean }) => {
          console.log('Session found:', sessionData);
          setFoundSession(sessionData);
          
          if (sessionData.isValid) {
            setAttendanceStatus({
              type: 'info',
              message: 'Valid session found! Tap to mark attendance.'
            });
          } else {
            // setAttendanceStatus({
            //   type: 'error',
            //   message: 'Invalid session format detected.'
            // });
          }
          
          stopScan();
          setScanning(false);
        },
        (error: string) => {
          console.error('Scan error:', error);
          // setAttendanceStatus({
          //   type: 'error',
          //   message: error
          // });
          setScanning(false);
        }
      );
      
     
    
      
    } catch (error: any) {
      console.error('Scan failed:', error);
      // setAttendanceStatus({
      //   type: 'error',
      //   message: error.message || 'Failed to start scanning'
      // });
      setScanning(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!foundSession || !foundSession.isValid) {
      Alert.alert('Error', 'No valid session found. Please scan again.');
      return;
    }
    
    if (!student) {
      Alert.alert('Error', 'Student data not loaded. Please try again.');
      return;
    }
    
    try {
      setAttendanceStatus({
        type: 'info',
        message: 'Submitting attendance...'
      });
      
      console.log('Marking attendance for student:', student.id);
      
      await submitAttendance(
        foundSession.code, 
        student.id, 
        supabase, 
        
        
        true // This was scanned via BLE
      );
      
      setAttendanceStatus({
        type: 'success',
        message: 'Attendance marked successfully!'
      });
      
      // Clear the found session after successful submission
      setFoundSession(null);
      
      Alert.alert(
        'Success',
        'Your attendance has been marked successfully!',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('Attendance submission failed:', error);
      setAttendanceStatus({
        type: 'error',
        message: error.message || 'Failed to mark attendance'
      });
      
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    }
  };

  const handleStopScan = () => {
    stopScan();
    setScanning(false);
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
    setAttendanceStatus({
      type: 'info',
      message: 'Scan stopped'
    });
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-300';
      case 'error': return 'bg-red-100 border-red-300';
      case 'info': return 'bg-blue-100 border-blue-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusTextColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-800';
      case 'error': return 'text-red-800';
      case 'info': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.multiRemove([
                'student_name',
                'student_email',
                'student_roll',
                'student_batch',
                'student_id'
              ]);
              
              // Navigate back to login
              router.replace('/auth/student-login');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefreshProfile = async () => {
    setLoading(true);
    try {
      const studentData = await getStudentData();
      setStudent(studentData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      Alert.alert('Error', 'Failed to refresh profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-lg text-gray-600 mt-4">Loading student data...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-red-600">Failed to load student data</Text>
        <TouchableOpacity 
          className="bg-blue-500 rounded-lg p-4 mt-4"
          onPress={() => {
            setLoading(true);
            setStudent(null);
            // Reload student data
            getStudentData().then(setStudent).finally(() => setLoading(false));
          }}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-8">
      <View className="mt-8 mb-8">
        {/* Header with back and logout */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            onPress={() => { router.push('/'); }}
            className="flex-row items-center"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center"
          >
            <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
            <Text className="ml-2 text-red-600 font-jura">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Box - Top Left */}
        <View className="bg-gray-100 rounded-lg p-4 mb-6 self-star mt-8 mx-2">
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="account-circle" size={40} color="#000" />
            <View className="ml-3  ">
              <Text className="text-lg font-jura-bold">{student.name}</Text>
               <View>
              {/* <Text className="text-sm font-jura text-gray-600">Roll: {student.rollNo}</Text> */}
              <Text className="text-sm font-jura text-gray-600">Batch: {student.batch}</Text>
            </View></View>
          </View>
        </View>

        {/* Center Lottie Animation */}
        <View className="items-center mb-8">
          <Animated.View style={animatedStyle}>
            <LottieView
              ref={lottieRef}
              source={scanning ? require('../../assets/scan.json') : require('../../assets/Student.json')}
              style={{ width: 300, height: 300 }}
              autoPlay
              loop
            />
          </Animated.View>
        </View>

        {/* Scanning Status Card */}
        <View className="bg-gray-100 rounded-lg p-6 mb-6">
          <Text className="text-xl font-jura-bold mb-4">Attendance Status</Text>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons 
              name={scanning ? "bluetooth-connect" : "bluetooth-off"} 
              size={20} 
              color={scanning ? "#2563eb" : "#ef4444"} 
            />
            <Text className="ml-2 font-jura">
              {scanning ? "Scanning..." : "Ready to Scan"}
            </Text>
          </View>
          
          {foundSession && (
            <>
              <Text className="font-jura text-sm text-gray-600 mb-2">
                Session Code: {foundSession.code}
              </Text>
              <Text className="font-jura text-xs text-blue-600">
                📡 Session Found • Ready to mark attendance
              </Text>
            </>
          )}
          
          {scanning && (
            <Text className="font-jura text-xs text-blue-600">
              🔍 Scanning for sessions • Make sure you're near teacher's device
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {!scanning ? (
          <TouchableOpacity
            className="rounded-2xl py-4 items-center mb-4 bg-black/10 border"
            onPress={handleScan}
          >
            <Text className="text-black text-xl font-jura-bold">
              Scan for Attendance
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-red-600 rounded-2xl py-4 items-center mb-4"
            onPress={handleStopScan}
          >
            <Text className="text-white text-xl font-jura-bold">Stop Scanning</Text>
          </TouchableOpacity>
        )}

        {/* Mark Attendance Button */}
        {foundSession && foundSession.isValid && (
          <TouchableOpacity
            className="bg-green-600 rounded-2xl py-4 items-center mb-4"
            onPress={handleMarkAttendance}
          >
            <Text className="text-white text-xl font-jura-bold">Mark My Attendance</Text>
          </TouchableOpacity>
        )}

        {/* Status Messages */}
        {attendanceStatus && (
          <View className={`p-4 rounded-lg mb-4 ${getStatusColor(attendanceStatus.type)}`}>
            <Text className={`font-jura text-center ${getStatusTextColor(attendanceStatus.type)}`}>
              {attendanceStatus.message}
            </Text>
          </View>
        )}

      </View>
    </ScrollView>
  );

}
