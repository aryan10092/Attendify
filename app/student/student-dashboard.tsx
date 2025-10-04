import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function StudentDashboard() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white px-6 pt-16 items-center gap-10">
      
      <View className='w-full self-start'>
      <Text className="text-4xl font-krona mb-2 self-start">Dashboard</Text>
      <Text className="text-gray-400 text-md font-jura-bold mb-2 self-start">
        Choose an option to continue
      </Text>
      </View>
      <LottieView
        source={require('../../assets/Student.json')}
        style={{ width: 300, height: 300, marginBottom: 0 }}
        autoPlay
        loop
      />
      <View className="flex-col gap-4 mb-8 ">
        <TouchableOpacity
          className="bg-black max-w-[300px] w-full flex flex-row gap-4 rounded-2xl py-4 px-5 shadow-lg items-center justify-between"
          onPress={() => router.push('./dashboard')}
        >
          <View className="flex-row items-center gap-4 w-full">
            <MaterialCommunityIcons name="school" size={24} color="#fff" />
            <Text className="text-white text-2xl font-jura-bold">Classes</Text>
          <MaterialCommunityIcons name="chevron-right" className='ml-auto' size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
        onPress={() => router.push('./Ai')}
            className="bg-black max-w-[300px] w-full flex flex-row gap-4 rounded-2xl py-4 px-5 shadow-lg items-center justify-between"
        >
          <View className="flex-row items-center gap-4 w-full">
            <MaterialCommunityIcons name="robot" size={24} color="#fff" />
            <Text className="text-white text-2xl font-jura-bold">AI Assistant</Text>
          <MaterialCommunityIcons name="chevron-right"  className='ml-auto' size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-black max-w-[300px] w-full flex flex-row gap-4 rounded-2xl py-4 px-5 shadow-lg items-center justify-between"
          onPress={() => router.push('./check-attendance')}
        >
          <View className="flex-row items-center gap-4 w-full">
            <MaterialCommunityIcons name="clipboard-check" size={24} color="#fff" />
            <Text className="text-white text-2xl font-jura-bold">Check Attendance</Text>
          <MaterialCommunityIcons name="chevron-right" className='ml-auto' size={24} color="#fff" />
          </View>
        </TouchableOpacity>

      </View>

      {/* Floating Chatbot Icon */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-slate-800 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('./Chatbot')}
      >
        <MaterialCommunityIcons name="chat" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}