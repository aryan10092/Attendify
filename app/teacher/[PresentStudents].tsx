
import  { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { 
  startAttendanceSession, 
  getAttendanceStats,
  cleanupExpiredSessions,
  stopBLEAdvertising
} from '../../utils/ble';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  student_id: string;
  name: string;
  email: string;
  roll_number: string;
  batch: string;
  present: boolean;
}

export default function PresentStudents() {
  const router = useRouter();
  const { PresentStudents } = useLocalSearchParams<{ PresentStudents: string }>();
  const currentClassId = PresentStudents || 'Unknown';
  
  // State for students and attendance
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);
  const [manualAttendanceOverrides, setManualAttendanceOverrides] = useState<{[key: string]: boolean}>({});
  
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
  
  const presentCount = students.filter((s: Student) => s.present).length;


  useEffect(() => {
    fetchStudentsAndAttendance();
    cleanupExpiredSessions();
  }, [currentClassId]);

  // useEffect(() => {
  //   if (currentClassId !== 'Unknown') {
  //     const interval = setInterval(() => {
  //       checkAttendanceStatus();
  //     }, 10000); // Check every 10 seconds
      
  //     return () => clearInterval(interval);
  //   }
  // }, [currentClassId, sessionData]);

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all students from Supabase
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('batch', { ascending: true })
        .order('roll_number', { ascending: true });

      if (studentsError) throw studentsError;

      // Check attendance status for each student
      const studentsWithAttendance = await Promise.all(
        (studentsData || []).map(async (student: any) => {
          // Check if there's a manual override for this student
          let isPresent;
          if (manualAttendanceOverrides.hasOwnProperty(student.student_id)) {
            isPresent = manualAttendanceOverrides[student.student_id];
            console.log(`Using manual override for ${student.name}: ${isPresent}`);
          } else {
            isPresent = await checkStudentAttendance(student.student_id);
          }
          
          return {
            id: student.id,
            student_id: student.student_id,
            name: student.name,
            email: student.email,
            roll_number: student.roll_number,
            batch: student.batch,
            present: isPresent
          };
        })
      );

      setStudents(studentsWithAttendance);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching students and attendance:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const checkStudentAttendance = async (studentId: string): Promise<boolean> => {
    try {
      // Get today's date in ISO format for comparison
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Check attendance_sessions table for sessions today for this class
      const { data: attendanceSessions, error: attSessionError } = await supabase
        .from('attendance_sessions')
        .select('id, created_at')
        .eq('code', currentClassId)
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)
        .order('created_at', { ascending: false });

      if (attSessionError) {
        console.error('Error checking attendance sessions:', attSessionError);
        return false;
      }

      if (!attendanceSessions || attendanceSessions.length === 0) {
        console.log(`No attendance sessions found for class ${currentClassId} today`);
        return false;
      }


      // Check attendance logs for any of these sessions
      for (const session of attendanceSessions) {
        const { data: attendanceLogs, error: logError } = await supabase
          .from('attendance_logs')
          .select('id, created_at')
          .eq('session_id', session.id)
          .eq('student_id', studentId);

        if (!logError && attendanceLogs && attendanceLogs.length > 0) {
          return true; // Student has marked attendance in at least one session
        }
      }

      return false;

    } catch (error) {
      console.error('Error checking student attendance:', error);
      return false;
    }
  };

  const checkAttendanceStatus = async () => {
    if (currentClassId === 'Unknown') return;

    try {
      setCheckingAttendance(true);
      
      // Refresh attendance status for all students
      const updatedStudents = await Promise.all(
        students.map(async (student) => {
          // Check if there's a manual override for this student
          if (manualAttendanceOverrides.hasOwnProperty(student.student_id)) {
            return { ...student, present: manualAttendanceOverrides[student.student_id] };
          }
          
          // Otherwise, check database
          const isPresent = await checkStudentAttendance(student.student_id);
          return { ...student, present: isPresent };
        })
      );

      setStudents(updatedStudents);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error checking attendance status:', error);
    } finally {
      setCheckingAttendance(false);
    }
  };

  
  useEffect(() => {
    let interval: any;
    
    if (isSessionActive && sessionData) {
      const updateStats = async () => {
        try {
          const stats = await getAttendanceStats(sessionData.sessionId, supabase);
          setAttendanceStats(stats);
          setAttendanceCount(stats.totalAttendees);
          
          // Also refresh student attendance status
          await checkAttendanceStatus();
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
      console.error('Start session error:', error);
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

  const handleStudentToggle = async (studentId: string) => {
    try {
      // Find the student
      const student = students.find(s => s.student_id === studentId);
      if (!student) return;

      const newStatus = !student.present;
      
      Alert.alert(
        'Manual Attendance',
        `Mark ${student.name} as ${newStatus ? 'Present' : 'Absent'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: async () => {
              try {
                // Update local state immediately for better UX
                const updatedStudents = students.map(s => 
                  s.student_id === studentId ? { ...s, present: newStatus } : s
                );
                setStudents(updatedStudents);
                
                // Store manual override to prevent automatic refresh from overriding
                setManualAttendanceOverrides(prev => ({
                  ...prev,
                  [studentId]: newStatus
                }));
                
                if (newStatus) {
                  // If marking present, create attendance record in database
                  await createManualAttendanceRecord(studentId, student.name);
                } else {
                  // If marking absent, remove attendance record
                  await removeAttendanceRecord(studentId);
                }
                
                setLastUpdated(new Date());
                
              } catch (error) {
                console.error('Error saving manual attendance:', error);
                // Revert local state on error
                const revertedStudents = students.map(s => 
                  s.student_id === studentId ? { ...s, present: !newStatus } : s
                );
                setStudents(revertedStudents);
                
                Alert.alert('Error', 'Failed to save attendance. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error toggling student attendance:', error);
    }
  };

  const createManualAttendanceRecord = async (studentId: string, studentName: string) => {
    try {
      // First, get or create an attendance session for today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      
      // Check if there's already a session for today
      let { data: existingSessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('teacher_id', currentClassId)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      let sessionId;
      
      if (existingSessions && existingSessions.length > 0) {
        sessionId = existingSessions[0].id;
      } else {
        // Create a new manual attendance session
        const sessionCode = `manual-${Date.now()}`;
        const expiresAt = new Date(today.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const { data: newSession, error: createError } = await supabase
          .from('attendance_sessions')
          .insert([{
            code: currentClassId,
            teacher_id: `manual-${currentClassId}`,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
          }])
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      // Check if attendance record already exists
      const { data: existingLog, error: logCheckError } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .single();

      if (logCheckError && logCheckError.code !== 'PGRST116') {
        throw logCheckError;
      }

      if (!existingLog) {
        // Create attendance log entry
        const { error: logError } = await supabase
          .from('attendance_logs')
          .insert([{
            session_id: sessionId,
            student_id: studentId,
            created_at: new Date().toISOString()
          }]);

        if (logError) throw logError;
      }

      console.log(`Manual attendance record created for ${studentName}`);
      
    } catch (error) {
      console.error('Error creating manual attendance record:', error);
      throw error;
    }
  };

  const removeAttendanceRecord = async (studentId: string) => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      
      // Get today's sessions for this class
      const { data: todaySessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('teacher_id', currentClassId)
        .gte('created_at', todayStart);

      if (sessionError) throw sessionError;

      if (todaySessions && todaySessions.length > 0) {
        // Remove attendance logs for today's sessions
        for (const session of todaySessions) {
          const { error: deleteError } = await supabase
            .from('attendance_logs')
            .delete()
            .eq('session_id', session.id)
            .eq('student_id', studentId);

          if (deleteError) {
            console.error('Error deleting attendance log:', deleteError);
          }
        }
      }

      console.log(`Attendance records removed for student ${studentId}`);
      
    } catch (error) {
      console.error('Error removing attendance record:', error);
      throw error;
    }
  };

  const exportAttendanceReport = async () => {
    try {
      setLoading(true);
      
      // Get today's date for the report
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Fetch attendance sessions for today
      const { data: sessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id, created_at, code')
        .eq('code', currentClassId)
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd);

      if (sessionError) throw sessionError;

      // Create attendance report data
      const reportData = {
        class: currentClassId,
        date: today.toDateString(),
        totalStudents: students.length,
        presentStudents: presentCount,
        attendanceRate: students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0,
        sessions: sessions?.length || 0,
        students: students.map(student => ({
          name: student.name,
          rollNumber: student.roll_number,
          batch: student.batch,
          status: student.present ? 'Present' : 'Absent',
          studentId: student.student_id
        })),
        exportedAt: new Date().toISOString(),
        lastUpdated: lastUpdated?.toISOString() || null
      };

      // For now, just show the report data in an alert
      // In a real app, you might want to save to file or send via email
      Alert.alert(
        'Attendance Report Exported',
        `Report for Class ${currentClassId}\nDate: ${today.toDateString()}\nPresent: ${presentCount}/${students.length} (${reportData.attendanceRate}%)\n\nReport data logged to console.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back after export
              router.back();
            }
          }
        ]
      );

      // Log the full report data
      console.log('Attendance Report:', JSON.stringify(reportData, null, 2));

    } catch (error: any) {
      console.error('Error exporting attendance report:', error);
      Alert.alert('Export Error', error.message || 'Failed to export attendance report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-8">
      <View className=" mt-8 mb-8">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          <Text className="ml-2 text-lg font-jura">Back to Class</Text>
        </TouchableOpacity>
        
        <View className="items-center mt-4">
          <MaterialCommunityIcons name="account-group" size={80} color="#000" />
          <Text className="text-3xl font-jura-bold mt-4 mb-2">Class {currentClassId}</Text>
          <Text className="text-lg font-jura text-gray-600 mb-8">Attendance Session</Text>
        </View>
      </View>

      <View className="w-full mb-6">
        {/* Session Status Card */}
        <View className="bg-gray-100 rounded-lg p-6 mb-6">
          <Text className="text-xl font-jura-bold mb-4">Session Status</Text>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons 
              name={isSessionActive ? "wifi" : "wifi-off"} 
              size={20} 
              color={isSessionActive ? "#22c55e" : "#ef4444"} 
            />
            <Text className="ml-2 font-jura">
              {isSessionActive ? "Active" : "Inactive"}
            </Text>
          </View>
          
          {isSessionActive && sessionData && (
            <>
              <Text className="font-jura text-sm text-gray-600 mb-2">
                Session Code: {sessionData.sessionCode}
              </Text>
              <Text className="font-jura text-sm text-gray-600 mb-2">
                Students Present: {attendanceCount}
              </Text>
              <Text className="font-jura text-sm text-gray-600 mb-2">
                Expires: {sessionData.expiresAt.toLocaleTimeString()}
              </Text>
              <Text className="font-jura text-xs text-blue-600">
                📡 BLE Broadcasting Active • Auto-refreshing every 5s
              </Text>
            </>
          )}
        </View>

        {/* Session Control Buttons */}
        {!isSessionActive ? (
          <TouchableOpacity
            className="rounded-2xl py-4 items-center mb-4 bg-green-600"
            onPress={handleStartSession}
            disabled={isLoading}
          >
            <Text className="text-white text-xl font-jura-bold">
              {isLoading ? 'Starting Session...' : 'Start BLE Session'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              className="bg-blue-600 rounded-2xl py-4 items-center mb-4"
              onPress={() => {
                if (sessionData) {
                  getAttendanceStats(sessionData.sessionId, supabase)
                    .then(stats => {
                      setAttendanceStats(stats);
                      setAttendanceCount(stats.totalAttendees);
                    })
                    .catch(error => console.error('Error refreshing stats:', error));
                }
              }}
            >
              <Text className="text-white text-xl font-jura-bold">Refresh Count</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="bg-red-600 rounded-2xl py-4 items-center mb-4"
              onPress={handleStopSession}
              disabled={isLoading}
            >
              <Text className="text-white text-xl font-jura-bold">
                {isLoading ? 'Stopping...' : 'Stop Session'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Students List */}
        <View className="flex-row justify-between items-center mb-4 mt-6">
          <Text className="text-xl font-jura-bold">Students</Text>
          <View className="flex-row space-x-2">
            {/* {Object.keys(manualAttendanceOverrides).length > 0 && (
              <TouchableOpacity
                className="bg-orange-500 rounded-lg px-2 py-2 mr-1"
                onPress={() => {
                  Alert.alert(
                    'Clear Manual Changes',
                    'Clear all manual attendance changes and refresh from database?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Clear', 
                        onPress: () => {
                          setManualAttendanceOverrides({});
                          checkAttendanceStatus();
                        }
                      }
                    ]
                  );
                }}
              >
                <Text className="text-white font-jura-bold text-xs">
                  Clear ({Object.keys(manualAttendanceOverrides).length})
                </Text>
              </TouchableOpacity>
            )} */}
            {/* <TouchableOpacity
              className="bg-green-500 rounded-lg px-3 py-2 mr-2"
              onPress={checkAttendanceStatus}
              disabled={loading || checkingAttendance}
            >
              <Text className="text-white font-jura-bold text-xs">
                {checkingAttendance ? 'Checking...' : 'Check Attendance'}
              </Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              className="bg-blue-500 rounded-lg px-4 py-2"
              onPress={fetchStudentsAndAttendance}
              disabled={loading}
            >
              <Text className="text-white font-jura-bold text-sm">
                {loading ? 'Refreshing...' : 'Refresh All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-lg font-jura text-gray-600">Loading students...</Text>
          </View>
        ) : error ? (
          <View className="items-center py-8">
            <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
            <Text className="mt-4 text-lg font-jura text-red-600 text-center">{error}</Text>
            <TouchableOpacity
              className="mt-4 bg-blue-500 rounded-lg py-3 px-6"
              onPress={fetchStudentsAndAttendance}
            >
              <Text className="text-white font-jura-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : students.length === 0 ? (
          <View className="items-center py-8">
            <MaterialCommunityIcons name="account-search" size={48} color="#6b7280" />
            <Text className="mt-4 text-lg font-jura text-gray-600 text-center">
              No students found
            </Text>
          </View>
        ) : (
          <>
            {/* Attendance Summary */}
            <View className="bg-green-50 rounded-lg p-4 mb-4">
              <View className="flex-row justify-between">
                <Text className="font-jura text-green-800">
                  Present: {presentCount}
                </Text>
                <Text className="font-jura text-green-800">
                  Total: {students.length}
                </Text>
              </View>
              <Text className="font-jura text-sm text-green-600 mt-1">
                Attendance Rate: {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
              </Text>
              {lastUpdated && (
                <Text className="font-jura text-xs text-green-500 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Text>
              )}
              {checkingAttendance && (
                <Text className="font-jura text-xs text-blue-600 mt-1">
                  🔄 Checking attendance status...
                </Text>
              )}
            </View>
            
            {students.map((student: Student) => (
              <TouchableOpacity
                key={student.student_id}
                className={`border border-gray-300 rounded-lg p-4 mb-3 ${
                  student.present ? 'bg-green-100' : 'bg-gray-100'
                }`}
                onPress={() => handleStudentToggle(student.student_id)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons 
                      name={student.present ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={student.present ? "#22c55e" : "#6b7280"} 
                    />
                    <View className="ml-3">
                      <Text className="text-lg font-jura-bold">{student.name}</Text>
                      <Text className="text-sm font-jura text-gray-600">Roll: {student.roll_number}</Text>
                      <Text className="text-xs font-jura text-gray-500">Batch: {student.batch}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className={`font-jura-bold ${student.present ? 'text-green-600' : 'text-gray-500'}`}>
                      {student.present ? 'Present' : 'Absent'}
                    </Text>
                    <Text className="text-xs font-jura text-gray-400">
                      ID: {student.student_id.substring(0, 8)}...
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Additional Actions */}
        <TouchableOpacity
          className="border border-gray-300 bg-[#333333] rounded-2xl py-4 items-center mb-4 mt-6"
          onPress={exportAttendanceReport}
          disabled={loading}
        >
          <Text className="text-white text-lg font-jura-bold">
            {loading ? 'Exporting...' : 'Export Attendance Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}