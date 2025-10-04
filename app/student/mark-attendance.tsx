import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState, useEffect } from "react";
import { 
  requestBluetoothPermissions, 
  sendStudentPresence,
  StudentPresencePayload 
} from "../../utils/ble";

export default function MarkAttendance() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    // Request permissions when component mounts
    requestBluetoothPermissions().then(granted => {
      if (!granted) {
        Alert.alert("Permissions Required", "Bluetooth permissions are needed to mark attendance");
      }
    });
  }, []);

  const markPresent = async () => {
    if (!studentId.trim() || !classId.trim() || !sessionCode.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setIsMarking(true);
    
    try {
      // Check permissions again before sending
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        Alert.alert("Error", "Bluetooth permissions are required");
        setIsMarking(false);
        return;
      }

      const payload: StudentPresencePayload = {
        studentId: studentId.trim(),
        classId: classId.trim(),
        sessionCode: sessionCode.trim()
      };

      await sendStudentPresence(payload, 5000); // Send for 5 seconds
      
      Alert.alert(
        "Attendance Marked", 
        `You have been marked present for Class ${classId}`,
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      Alert.alert("Error", "Failed to mark attendance. Please try again.");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="flex-1 bg-white px-8">
      <View className="mt-16 mb-8">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          <Text className="ml-2 text-lg font-jura">Back to Dashboard</Text>
        </TouchableOpacity>
        
        <View className="items-center">
          <MaterialCommunityIcons name="bluetooth" size={80} color="#22c55e" />
          <Text className="text-3xl font-jura-bold mt-4 mb-2">Mark Attendance</Text>
          <Text className="text-lg font-jura text-gray-600 mb-8 text-center">
            Enter your details and session code to mark yourself present
          </Text>
        </View>
      </View>

      <View className="w-full mb-6">
        {/* Student Information */}
        <Text className="text-xl font-jura-bold mb-4">Student Information</Text>
        
        <Text className="font-jura-bold text-lg mb-2 text-gray-600">Student ID</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-4 font-jura"
          placeholder="Enter your Student ID"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="none"
        />

        <Text className="font-jura-bold text-lg mb-2 text-gray-600">Class ID</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-4 font-jura"
          placeholder="Enter Class ID (e.g., CS101)"
          value={classId}
          onChangeText={setClassId}
          autoCapitalize="characters"
        />

        <Text className="font-jura-bold text-lg mb-2 text-gray-600">Session Code</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-8 font-jura"
          placeholder="Enter 4-digit session code"
          value={sessionCode}
          onChangeText={setSessionCode}
          keyboardType="numeric"
          maxLength={4}
        />

        {/* Action Button */}
        <TouchableOpacity
          className={`${isMarking ? "bg-gray-400" : "bg-green-600"} rounded-2xl py-6 items-center mb-4`}
          onPress={markPresent}
          disabled={isMarking}
        >
          {isMarking ? (
            <Text className="text-white text-xl font-jura-bold">Marking Present...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
              <Text className="text-white text-xl font-jura-bold mt-2">Mark Present</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View className="bg-blue-50 rounded-lg p-4">
          <Text className="font-jura-bold text-blue-800 mb-2">How it works:</Text>
          <Text className="font-jura text-blue-700 text-sm">
            1. Get the session code from your teacher{'\n'}
            2. Enter your details and the session code{'\n'}
            3. Tap "Mark Present" to send your attendance{'\n'}
            4. Your teacher will be notified instantly
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}