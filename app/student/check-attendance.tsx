import { View, Text, TouchableOpacity, ScrollView, Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";

// Mock attendance data for different time periods
const mockAttendanceData = {
  daily: [
    { date: "2025-09-25", subject: "Computer Science", status: "Present", time: "09:00 AM" },
    { date: "2025-09-25", subject: "Mathematics", status: "Present", time: "11:00 AM" },
    { date: "2025-09-25", subject: "Physics", status: "Absent", time: "02:00 PM" },
    { date: "2025-09-24", subject: "Computer Science", status: "Present", time: "09:00 AM" },
    { date: "2025-09-24", subject: "Mathematics", status: "Absent", time: "11:00 AM" },
    { date: "2025-09-24", subject: "Physics", status: "Present", time: "02:00 PM" },
    { date: "2025-09-23", subject: "Computer Science", status: "Present", time: "09:00 AM" },
    { date: "2025-09-23", subject: "Mathematics", status: "Present", time: "11:00 AM" },
    { date: "2025-09-23", subject: "Physics", status: "Present", time: "02:00 PM" },
  ],
  weekly: [
    { week: "Week 38 (Sep 16-22)", totalClasses: 15, attended: 12, percentage: 80 },
    { week: "Week 37 (Sep 9-15)", totalClasses: 15, attended: 14, percentage: 93 },
    { week: "Week 36 (Sep 2-8)", totalClasses: 15, attended: 13, percentage: 87 },
    { week: "Week 35 (Aug 26-Sep 1)", totalClasses: 15, attended: 15, percentage: 100 },
  ],
  monthly: [
    { month: "September 2025", totalClasses: 45, attended: 39, percentage: 87 },
    { month: "August 2025", totalClasses: 60, attended: 55, percentage: 92 },
    { month: "July 2025", totalClasses: 50, attended: 46, percentage: 92 },
    { month: "June 2025", totalClasses: 40, attended: 35, percentage: 88 },
  ]
};

type TimePeriod = 'daily' | 'weekly' | 'monthly';

const generateAttendanceCSV = () => {
  // Create CSV header
  const header = "Date,Subject,Status,Time\n";
  
  // Create CSV rows from daily attendance data
  const rows = mockAttendanceData.daily
    .map(record => `${record.date},${record.subject},${record.status},${record.time}`)
    .join('\n');
  
  return header + rows;
};

const downloadAttendanceReport = async () => {
  try {
    const csvContent = generateAttendanceCSV();
    
    await Share.share({
      message: csvContent,
      title: 'My Attendance Report',
    });
  } catch (error) {
    Alert.alert('Error', 'Failed to share attendance report');
  }
};

export default function CheckAttendance() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('daily');

  const getAttendanceIcon = (status: string) => {
    return status === "Present" ? "check-circle" : "close-circle";
  };

  const getAttendanceColor = (status: string) => {
    return status === "Present" ? "#22c55e" : "#ef4444";
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "#22c55e";
    if (percentage >= 75) return "#f59e0b";
    return "#ef4444";
  };

  const renderDailyView = () => (
    <View className="space-y-3 gap-3">
      {mockAttendanceData.daily.map((record, index) => (
        <View key={`${record.date}-${record.subject}-${index}`} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="font-jura-bold text-lg text-gray-800">{record.subject}</Text>
              <Text className="font-jura text-sm text-gray-500">{record.date} • {record.time}</Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons 
                name={getAttendanceIcon(record.status)} 
                size={24} 
                color={getAttendanceColor(record.status)} 
              />
              <Text 
                className={`font-jura-bold text-sm ml-2 ${record.status === "Present" ? "text-green-600" : "text-red-600"}`}
              >
                {record.status}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderWeeklyView = () => (
    <View className="space-y-3 gap-3">
      {mockAttendanceData.weekly.map((record, index) => (
        <View key={`${record.week}-${index}`} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-jura-bold text-lg text-gray-800">{record.week}</Text>
            <Text 
              className="font-jura-bold text-lg"
              style={{ color: getPercentageColor(record.percentage) }}
            >
              {record.percentage}%
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="font-jura text-gray-600">
              {record.attended}/{record.totalClasses} classes attended
            </Text>
            <View className="bg-gray-200 rounded-full h-2 w-24">
              <View 
                className="h-2 rounded-full"
                style={{ 
                  width: `${record.percentage}%`,
                  backgroundColor: getPercentageColor(record.percentage)
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMonthlyView = () => (
    <View className="space-y-3 gap-3">
      {mockAttendanceData.monthly.map((record, index) => (
        <View key={`${record.month}-${index}`} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-jura-bold text-lg text-gray-800">{record.month}</Text>
            <Text 
              className="font-jura-bold text-xl"
              style={{ color: getPercentageColor(record.percentage) }}
            >
              {record.percentage}%
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="font-jura text-gray-600">
              {record.attended}/{record.totalClasses} classes attended
            </Text>
            <View className="bg-gray-200 rounded-full h-3 w-32">
              <View 
                className="h-3 rounded-full"
                style={{ 
                  width: `${record.percentage}%`,
                  backgroundColor: getPercentageColor(record.percentage)
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const getCurrentAttendanceStats = () => {
    const totalClasses = mockAttendanceData.daily.length;
    const presentClasses = mockAttendanceData.daily.filter(record => record.status === "Present").length;
    const percentage = Math.round((presentClasses / totalClasses) * 100);
    return { totalClasses, presentClasses, percentage };
  };

  const stats = getCurrentAttendanceStats();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-6">
        {/* Header */}
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-6"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          <Text className="ml-2 text-lg font-jura">Back to Dashboard</Text>
        </TouchableOpacity>

        <View className="items-center mb-6">
          <MaterialCommunityIcons name="clipboard-check" size={80} color="#3b82f6" />
          <Text className="text-3xl font-jura-bold mt-4 mb-2">My Attendance</Text>
          <Text className="text-lg font-jura text-gray-600 text-center">
            Track your class attendance across different periods
          </Text>
        </View>

        {/* Overall Stats Card */}
        <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
          <Text className="font-jura-bold text-xl text-gray-800 mb-4 text-center">Overall Attendance</Text>
          <View className="items-center">
            <Text 
              className="font-jura-bold text-5xl mb-2"
              style={{ color: getPercentageColor(stats.percentage) }}
            >
              {stats.percentage}%
            </Text>
            <Text className="font-jura text-gray-600 text-lg">
              {stats.presentClasses}/{stats.totalClasses} classes attended
            </Text>
            <View className="bg-gray-200 rounded-full h-3 w-48 mt-3">
              <View 
                className="h-3 rounded-full"
                style={{ 
                  width: `${stats.percentage}%`,
                  backgroundColor: getPercentageColor(stats.percentage)
                }}
              />
            </View>
          </View>
        </View>

        {/* Time Period Selector */}
        <View className="flex-row bg-white rounded-2xl p-2 mb-6 border border-gray-200">
          {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              className={`flex-1 py-3 px-4 rounded-xl ${
                selectedPeriod === period ? 'bg-blue-600' : 'bg-transparent'
              }`}
            >
              <Text 
                className={`font-jura-bold text-center capitalize ${
                  selectedPeriod === period ? 'text-white' : 'text-gray-600'
                }`}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Attendance Records */}
        <View className="mb-6">
          <Text className="font-jura-bold text-xl text-gray-800 mb-4 capitalize">
            {selectedPeriod} Attendance
          </Text>
          {selectedPeriod === 'daily' && renderDailyView()}
          {selectedPeriod === 'weekly' && renderWeeklyView()}
          {selectedPeriod === 'monthly' && renderMonthlyView()}
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <Text className="font-jura-bold text-xl text-gray-800 mb-4">Quick Actions</Text>
          
          <TouchableOpacity 
            className="bg-blue-600 rounded-xl py-4 px-6 flex-row items-center justify-center"
            onPress={downloadAttendanceReport}
          >
            <MaterialCommunityIcons name="file-chart" size={24} color="#fff" />
            <Text className="text-white font-jura-bold text-lg ml-2">Download Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}