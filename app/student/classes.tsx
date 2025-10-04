import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

//ye aaega apna api se
const classesData = [
  { id: '1', name: 'DSA', teacher: 'Sakshi Goel' },
  { id: '2', name: 'DBMS', teacher: 'Mr. Machchar' },
  { id: '3', name: 'Java', teacher: 'Anupam Dedh' },
  { id: '4', name: 'C++', teacher: 'Priyanka' },
  { id: '5', name: 'Bhadwagiri', teacher: 'Aditya Bansal' },
  { id: '6', name: 'Guide to Inderlok', teacher: 'Aryan Gupta'},
  { id: '7', name: 'C++', teacher: 'Priyanka'}
];

export default function ClassesList() {
  const router = useRouter();

  const classbox = ({ item }: { item: { id: string; name: string; teacher: string } }) => (
    <TouchableOpacity
      className="bg-black flex flex-row gap-4 rounded-2xl py-4 px-5 shadow-lg items-center justify-between mb-3"
    //   onPress={() => router.push('')} jidhr fekna hoga
    >
      <View>
        <Text className="text-white text-2xl font-jura-bold">{item.name}</Text>
        <Text className="text-gray-300 text-sm">{item.teacher}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
    </TouchableOpacity>
  );

  const classadder = () => (
    <TouchableOpacity
      className="flex-row items-center justify-center border border-gray-400 rounded-2xl py-4 mb-6"
    >
      <MaterialCommunityIcons name="plus" size={24} color="#000" />
      <Text className="text-black text-2xl font-jura-bold ml-2">Join Class</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-4xl font-krona mb-2">Your Classes</Text>
      <Text className="text-gray-400 text-md font-jura-bold mb-6">
        Tap on a class to view details
      </Text>

      <FlatList
        data={classesData}
        keyExtractor={(item) => item.id}
        renderItem={classbox}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={classadder}
      />
    </View>
  );
}