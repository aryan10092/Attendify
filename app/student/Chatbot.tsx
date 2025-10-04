
import  { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '~/utils/supabase';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface StudentProfile {
  skills: string;
  interests: string;
  career: string;
}


function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

    interface StudentProfile {
  skills: string;
  interests: string;
  career: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'subject-selection' | 'chapter-selection' | 'topic-selection' | 'quiz' | 'quiz-result';
  data?: any;
}

  const getStudentProfile = async (): Promise<StudentProfile> => {
    try {
      const studentId = await AsyncStorage.getItem('student_id');
      if (!studentId) {
        return {
          skills: 'React Native, JavaScript',
          interests: 'AI, Education',
          career: 'Software Engineer'
        };
      }

      const { data, error } = await supabase
        .from('students')
        .select('skills, interests, career')
        .eq('student_id', studentId)
        .single();

      if (error) throw error;

      return {
        skills: data.skills || 'React Native, JavaScript',
        interests: data.interests || 'AI, Education',
        career: data.career || 'Software Engineer'
      };
    } catch (error) {
      console.error('Error fetching student profile:', error);
      return {
        skills: 'React Native, JavaScript',
        interests: 'AI, Education',
        career: 'Software Engineer'
      };
    }
  };


  const sendMessage = async () => {
    if (inputText.trim() === '' || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom after adding user message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const profile = await getStudentProfile();

      const chat_history = [...messages, newMessage].map(m => ({
        role: m.isUser ? 'user' : 'ai',
        content: m.text
      }));

      const body = {
        chat_history,
        skills: profile.skills,
        interests: profile.interests,
        career_goals: profile.career
      }

      const res = await fetch(
        'https://sih-2025-8jpb.onrender.com/chat_agent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );
      const data = await res.json();

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'No response from server.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom after AI response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  const renderMessage = ({ item }: { item: Message }) => (
    <View className={`flex-row mb-4 ${item.isUser ? 'justify-end' : 'justify-start'}`}>
      <View 
        className={`max-w-[80%] p-3 rounded-2xl ${
          item.isUser 
            ? 'bg-blue-500 rounded-br-md' 
            : 'bg-gray-500 rounded-bl-md'
        }`}
      >
        <Text className={`text-base font-jura ${item.isUser ? 'text-white' : 'text-white'}`}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-200">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-white px-6 py-4 shadow-sm">
          <Text className="text-black text-2xl font-krona ml-2">Chatbot</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View className="px-4 pb-2">
            <View className="flex-row justify-start">
              <View className="bg-gray-200 p-3 rounded-2xl rounded-bl-md">
                <Text className="text-gray-500 font-jura">AI is typing...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View className="flex-row items-center px-4 py-4 bg-gray-50 border-t border-gray-200">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-3 mr-3 font-jura"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={inputText.trim() === '' || isLoading}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              inputText.trim() === '' || isLoading ? 'bg-gray-300' : 'bg-blue-500'
            }`}
          >
            <MaterialCommunityIcons 
              name="send" 
              size={24} 
              color={inputText.trim() === '' || isLoading ? '#9CA3AF' : 'white'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default Chatbot