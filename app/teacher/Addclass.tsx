
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { getTeacherData } from '../../utils/teacherAuth';

export default function TeacherDashboard() {
  const router = useRouter();

  // State for form data
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<{day: string, time: string}[]>([]);
  
  // State for modals
  const [showDayModal, setShowDayModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDayForTime, setSelectedDayForTime] = useState('');
  
  // Loading state
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
  ];

  const handleClassSelection = async (classCode: string) => {
    console.log('Selected class:', classCode);
   
  };

  const handleDaySelection = (day: string) => {
    if (!selectedDays.includes(day)) {
      setSelectedDays([...selectedDays, day]);
    }
    setShowDayModal(false);
  };

  const handleTimeSelection = (time: string) => {
    if (selectedDayForTime) {
      const existingTimeIndex = selectedTimes.findIndex(
        item => item.day === selectedDayForTime
      );
      
      if (existingTimeIndex >= 0) {
        // Update existing time for the day
        const updatedTimes = [...selectedTimes];
        updatedTimes[existingTimeIndex].time = time;
        setSelectedTimes(updatedTimes);
      } else {
        // Add new day-time combination
        setSelectedTimes([...selectedTimes, { day: selectedDayForTime, time }]);
      }
    }
    setShowTimeModal(false);
    setSelectedDayForTime('');
  };

  const removeDayTime = (day: string) => {
    setSelectedDays(selectedDays.filter(d => d !== day));
    setSelectedTimes(selectedTimes.filter(t => t.day !== day));
  };

  const handleCreateClass = async () => {
    if (!className.trim() || !subject.trim() || selectedTimes.length === 0) {
      Alert.alert('Error', 'Please fill in all fields and add at least one class timing.');
      return;
    }

    setLoading(true);
    try {
      // Get teacher data for teacher ID
      const teacherData = await getTeacherData();
      if (!teacherData) {
        Alert.alert('Error', 'Teacher not logged in. Please login again.');
        setLoading(false);
        return;
      }

      // Generate a unique class code
      const classCode = `${subject.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: className.trim(),
          subject: subject.trim(),
          schedule: selectedTimes,
          teacher_id: teacherData.teacherId,
          class_code: classCode,
          is_active: true
        })
        .select();

      if (error) throw error;

      Alert.alert(
        'Success', 
        `Class "${className}" created successfully!\nClass Code: ${classCode}`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Reset form
              setClassName('');
              setSubject('');
              setSelectedDays([]);
              setSelectedTimes([]);
              // Navigate back to classes list
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="flex-grow  items-center bg-white px-8">
        <View className='mt-16'>
      
      </View>

      {/* <Text className="text-3xl font-jura-bold mb-12 mt-4">Add  Class    </Text> */}
      <View className='w-full'>
        <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]' >Class Name</Text>
     <TextInput
               className="border border-gray-300 rounded-lg p-4  mb-6 font-ju bg-black/10 text-lg"
               placeholder="Name"
               value={className}
               onChangeText={setClassName}
               autoCapitalize="none"
             />

               <Text className='font-jura-bold text-xl mb-2 text-[#8C8C8C]' >Subject</Text>
     <TextInput
               className="border border-gray-300 rounded-lg p-4  mb-6 font-ju bg-black/10 text-lg"
               placeholder="Subject"
               value={subject}
               onChangeText={setSubject}
               autoCapitalize="none"
             />
             </View>
      
      <View className="w-full mb-6">
        <Text className='font-jura-bold text-xl mb-5 mt-6 text-[#8C8C8C]'>Class Timings</Text>
        
        {/* Display selected class timings */}
        {selectedTimes.map((item, index) => (
          <View key={index} className="flex-row  items-center justify-between border border-gray-300 rounded-lg p-4 mb-5 bg-gray-100">
            <Text className="text-lg font-jura-bold">{item.day} - {item.time}</Text>
            <TouchableOpacity onPress={() => removeDayTime(item.day)}>
              <MaterialCommunityIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Add new day/time buttons */}
        <View className=' max-w-full '>
          <TouchableOpacity
            className="border border-gray-300 rounded-2xl py-4 px-6 mb-4 bg-[#333333]"
            onPress={() => setShowDayModal(true)}
          >
            <Text className="text-lg text-white font-jura-bold text-center">Set Class Timing</Text>
          </TouchableOpacity>
          
          {/* {selectedDays.length >= 0 && (
            <TouchableOpacity
              className="border border-gray-300 rounded-2xl py-4 px-12 mb-6 bg-[#333333]"
              onPress={() => {
                // Show day selection modal to choose which day to set time for
                //setShowDayModal(true);
                setShowTimeModal(true);
              }}
            >
              <Text className="text-lg text-white font-jura-bold text-center">Set Time</Text>
            </TouchableOpacity>
          )} */}
        </View>
      
        
        {/* <TextInput
          className="border border-gray-300 rounded-lg p-4 mb-6 font-jura"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        /> */}
        
        <TouchableOpacity
          className="bg-[#333333] rounded-2xl py-4 mt-3  items-center mb-4"
          onPress={handleCreateClass}
          disabled={loading}
        >
          <Text className="text-white text-xl font-jura-bold">
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
        
       
      </View>

      {/* Day Selection Modal */}
      <Modal
        visible={showDayModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-lg p-6 w-4/5 max-h-96">
            <Text className="text-xl font-jura-bold mb-4 text-center">Select Day</Text>
            <ScrollView>
              {daysOfWeek.map((day) => (
                <TouchableOpacity
                  key={day}
                  className={`p-4 rounded-lg mb-2 ${
                    selectedDays.includes(day) ? 'bg-gray-300' : 'bg-gray-100'
                  }`}
                  onPress={() => {
                     if (selectedDayForTime) {
                      setSelectedDayForTime(day);
                      setShowDayModal(false);
                      setShowTimeModal(true);
                    } else {
                     
                      handleDaySelection(day);
                      setSelectedDayForTime(day);
                      setShowTimeModal(true);
                    }
                  }}>

                  <Text className="text-center font-jura-bold">{day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              className="bg-red-500 rounded-lg p-3 mt-4"
              onPress={() => setShowDayModal(false)}
            >
              <Text className="text-white text-center font-jura-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-lg p-6 w-4/5 max-h-96">
            <Text className="text-xl font-jura-bold mb-4 text-center">
              Select Time for {selectedDayForTime}
            </Text>
            <ScrollView>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  className="p-4 rounded-lg mb-2 bg-gray-100"
                  onPress={() => handleTimeSelection(time)}
                >
                  <Text className="text-center font-jura-bold">{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              className="bg-red-500 rounded-lg p-3 mt-4"
              onPress={() => {
                setShowTimeModal(false);
                setSelectedDayForTime('');
              }}
            >
              <Text className="text-white text-center font-jura-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}