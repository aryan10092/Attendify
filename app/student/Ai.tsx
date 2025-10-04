import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'subject-selection' | 'chapter-selection' | 'topic-selection' | 'quiz' | 'quiz-result';
  data?: any;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizState {
  questions: QuizQuestion[];
  currentQuestion: number;
  score: number;
  userAnswers: string[];
  isComplete: boolean;
}

interface StudentProfile {
  skills: string;
  interests: string;
  career: string;
}

type SelectionStep = 'subject' | 'chapter' | 'topic' | 'completed';

export default function Ai() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRequestingTeacher, setIsRequestingTeacher] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('subject');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestion: 0,
    score: 0,
    userAnswers: [],
    isComplete: false
  });
  const [showLoader, setShowLoader] = useState(false);
  const slideAnimation = useRef(new Animated.Value(300)).current; // Start 300 pixels below screen
  const scrollViewRef = useRef<ScrollView>(null);

  
  const initialMessages = [
    'Hello! Let\'s start by selecting your subject of interest.',
    'Welcome! Please choose a subject to get started.',
    'Hi there! First, let\'s pick a subject you\'d like to learn about.',
    'Greetings! To begin, please select a subject from the options below.',
  ];

  // subject api call
  const fetchSubjects = async () => {
    try {
      console.log('Fetching subjects from API');
      setMessages([{
        id: '0',
        text: 'Fetching available subjects...',
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        data: null
    }]);
      setIsLoading(true);
      const response = await fetch('https://sih-2025-8jpb.onrender.com/get_subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
      console.log('Fetched subjects:', data.subjects);
      
      
      const randomMessage = initialMessages[Math.floor(Math.random() * initialMessages.length)];
      const initialMessage: Message = {
        id: '1',
        text: randomMessage,
        isUser: false,
        timestamp: new Date(),
        type: 'subject-selection',
        data: data.subjects || []
      };
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // chapter call
  const fetchChapters = async (subject: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://sih-2025-8jpb.onrender.com/get_chapters/${encodeURIComponent(subject)}`);
      const data = await response.json();
      setChapters(data.chapters || []);
      
      const chapterMessage: Message = {
        id: Date.now().toString(),
        text: `Great choice! Now select a chapter from ${subject}:`,
        isUser: false,
        timestamp: new Date(),
        type: 'chapter-selection',
        data: data.chapters || []
      };
      setMessages(prev => [...prev, chapterMessage]);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // topics call
  const fetchTopics = async (subject: string, chapter: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://sih-2025-8jpb.onrender.com/get_topics/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}`);
      const data = await response.json();
      setTopics(data.topics || []);
      
      const topicMessage: Message = {
        id: Date.now().toString(),
        text: `Excellent! Now choose a specific topic from "${chapter}":`,
        isUser: false,
        timestamp: new Date(),
        type: 'topic-selection',
        data: data.topics || []
      };
      setMessages(prev => [...prev, topicMessage]);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle subject selection
  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setCurrentStep('chapter');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I selected: ${subject}`,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    fetchChapters(subject);
  };

  // Handle chapter selection
  const handleChapterSelect = (chapter: string) => {
    setSelectedChapter(chapter);
    setCurrentStep('topic');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I selected: ${chapter}`,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    fetchTopics(selectedSubject, chapter);
  };

  // Handle topic selection
  const handleTopicSelect = async (topic: string) => {
    setSelectedTopic(topic);
    setCurrentStep('completed');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I selected: ${topic}`,
      isUser: true,
      timestamp: new Date()
    };
    
    const completionMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `Perfect! You've selected:\n📚 Subject: ${selectedSubject}\n📖 Chapter: ${selectedChapter}\n📝 Topic: ${topic}\n\nLet me get your teacher ready...`,
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage, completionMessage]);
    
    // Show thinking loader
    setIsThinking(true);
    
    // Automatically request teacher content after thinking
    setTimeout(() => {
      console.log('About to call handleFreeTeacherRequest'); // Debug log
      setIsRequestingTeacher(true); // Ensure loader continues
      setIsThinking(false);
      // Call API directly without the currentStep check since we know we're in the right state
      handleFreeTeacherRequestDirect(selectedSubject, selectedChapter, topic);
    }, 1000);
  };

  // Initialize on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Handle quiz answer selection
  const handleQuizAnswer = (selectedOption: string, questionIndex: number) => {
    const currentQuestion = quizState.questions[questionIndex];
    const isCorrect = selectedOption === currentQuestion.answer;
    
    const newUserAnswers = [...quizState.userAnswers];
    newUserAnswers[questionIndex] = selectedOption;
    
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;
    const isLastQuestion = questionIndex === quizState.questions.length - 1;
    
    setQuizState(prev => ({
      ...prev,
      userAnswers: newUserAnswers,
      score: newScore,
      currentQuestion: isLastQuestion ? prev.currentQuestion : prev.currentQuestion + 1,
      isComplete: isLastQuestion
    }));

    // Show user's answer
    const answerMessage: Message = {
      id: Date.now().toString(),
      text: `You selected: ${selectedOption}${isCorrect ? ' ✅ Correct!' : ` ❌ Incorrect! The correct answer was: ${currentQuestion.answer}`}`,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, answerMessage]);

    // Show next question or final score
    if (isLastQuestion) {
      setTimeout(() => {
        const finalScore = isCorrect ? newScore : quizState.score;
        const scorePercentage = Math.round((finalScore / quizState.questions.length) * 100);
        
        const scoreMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `🎉 Quiz Complete!\n\nYour Final Score: ${finalScore}/${quizState.questions.length} (${scorePercentage}%)\n\n${
            scorePercentage >= 80 ? '🌟 Excellent work!' :
            scorePercentage >= 60 ? '👍 Good job!' :
            scorePercentage >= 40 ? '📚 Keep studying!' :
            '💪 Practice makes perfect!'
          }`,
          isUser: false,
          timestamp: new Date(),
          type: 'quiz-result'
        };
        
        setMessages(prev => [...prev, scoreMessage]);
      }, 1000);
    } else {
      // Show next question after a brief delay
      setTimeout(() => {
        const nextQuestion = quizState.questions[questionIndex + 1];
        const nextQuestionMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: `Question ${questionIndex + 2}/${quizState.questions.length}`,
          isUser: false,
          timestamp: new Date(),
          type: 'quiz',
          data: {
            question: nextQuestion,
            questionIndex: questionIndex + 1
          }
        };
        
        setMessages(prev => [...prev, nextQuestionMessage]);
      }, 1500);
    }
  };

  
  // const getStudentProfile = async (): Promise<StudentProfile> => {
  //   try {
  //     const studentId = await AsyncStorage.getItem('student_id');
  //     if (!studentId) {
  //       return {
  //         skills: 'React Native, JavaScript',
  //         interests: 'AI, Education',
  //         career: 'Software Engineer'
  //       };
  //     }

  //     const { data, error } = await supabase
  //       .from('students')
  //       .select('skills, interests, career')
  //       .eq('student_id', studentId)
  //       .single();

  //     if (error) throw error;

  //     return {
  //       skills: data.skills || 'React Native, JavaScript',
  //       interests: data.interests || 'AI, Education',
  //       career: data.career || 'Software Engineer'
  //     };
  //   } catch (error) {
  //     console.error('Error fetching student profile:', error);
  //     return {
  //       skills: 'React Native, JavaScript',
  //       interests: 'AI, Education',
  //       career: 'Software Engineer'
  //     };
  //   }
  // };

  
  const requestFreeTeacher = async (
    subject: string,
    chapter: string,
    topic: string,
    minutes: number
  ): Promise<{ content: any; quiz: any }> => {
    try {
      const body = { subject, chapter, topic, minutes };
      console.log('🚀 Making API call to free teacher with body:', body);
      
      const res = await fetch(
        'https://sih-2025-8jpb.onrender.com/free/teacher',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      console.log('📡 API Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`API call failed with status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ API Response data:', JSON.stringify(data, null, 2));
      
      return data;
    } catch (error) {
      console.error('❌ Error requesting free teacher:', error);
      throw error;
    }
  }

  
  // Direct API call function without state checks
  const handleFreeTeacherRequestDirect = async (subject: string, chapter: string, topic: string) => {
    console.log('handleFreeTeacherRequestDirect called with:', { subject, chapter, topic }); // Debug log
    
    const minutes = 30;

    try {
      console.log('Making direct API call to requestFreeTeacher'); // Debug log
      const response = await requestFreeTeacher(
        subject,
        chapter,
        topic,
        minutes
      )
      console.log('requestFreeTeacher response received:', response); // Debug log

      // Initialize quiz state
      setQuizState({
        questions: response.quiz.quiz,
        currentQuestion: 0,
        score: 0,
        userAnswers: [],
        isComplete: false
      });

      const contentMessage: Message = {
        id: Date.now().toString(),
        text: `📚 Here's what I found about "${topic}":\n\n${response.content.summary}`,
        isUser: false,
        timestamp: new Date()
      }

      const detailsMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `🔍 Key Points:\n\n${response.content.condensed_content.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n\n')}`,
        isUser: false,
        timestamp: new Date()
      }

      // Start quiz with first question
      const firstQuestion = response.quiz.quiz[0];
      const quizStartMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `🎯 Let's test your knowledge! Question 1/${response.quiz.quiz.length}`,
        isUser: false,
        timestamp: new Date(),
        type: 'quiz',
        data: {
          question: firstQuestion,
          questionIndex: 0
        }
      }

      setMessages(prev => [...prev, contentMessage, detailsMessage, quizStartMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I couldn\'t fetch the teacher content right now. Please try again later.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsRequestingTeacher(false);
    }
  }

  const handleFreeTeacherRequest = async () => {
    console.log('handleFreeTeacherRequest called, currentStep:', currentStep); // Debug log
    if (currentStep !== 'completed') {
      console.log('Exiting early - currentStep is not completed'); // Debug log
      return;
    }
    
    await handleFreeTeacherRequestDirect(selectedSubject, selectedChapter, selectedTopic);
  }

  // const sendMessage = async () => {
  //   if (inputText.trim() === '') return;

  //   const newMessage: Message = {
  //     id: Date.now().toString(),
  //     text: inputText,
  //     isUser: true,
  //     timestamp: new Date()
  //   };
  //   setMessages(prev => [...prev, newMessage]);
  //   setInputText('');

  //   try {
  //     const profile = await getStudentProfile();

  //     const chat_history = [...messages, newMessage].map(m => ({
  //       role: m.isUser ? 'user' : 'ai',
  //       content: m.text
  //     }));

  //     const body = {
  //       chat_history,
  //       skills: profile.skills,
  //       interests: profile.interests,
  //       career_goals: profile.career
  //     }

  //     const res = await fetch(
  //       'https://sih-2025-yjed.onrender.com/chat_agent',
  //       {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(body)
  //       }
  //     );
  //     const data = await res.json();

  //     const aiResponse: Message = {
  //       id: (Date.now() + 1).toString(),
  //       text: data.response || 'No response from server.',
  //       isUser: false,
  //       timestamp: new Date()
  //     };
  //     setMessages(prev => [...prev, aiResponse]);
  //   } catch (error) {
  //     const errMsg: Message = {
  //       id: (Date.now() + 1).toString(),
  //       text: 'Error: ' + (error as Error).message,
  //       isUser: false,
  //       timestamp: new Date()
  //     }
  //     setMessages(prev => [...prev, errMsg]);
  //   }
  // }

 
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Animation functions
  const showLoaderWithAnimation = () => {
    setShowLoader(true);
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideLoaderWithAnimation = () => {
    Animated.timing(slideAnimation, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLoader(false);
    });
  };

  // Handle loader visibility based on loading states
  useEffect(() => {
    if (isLoading || isRequestingTeacher || isThinking) {
      showLoaderWithAnimation();
    } else {
      hideLoaderWithAnimation();
    }
  }, [isLoading, isRequestingTeacher, isThinking]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-200"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-white pt-8 pb-4 px-6 flex-row items-center gap-2">
        <MaterialCommunityIcons name="robot" size={25} color="#000" />
        <Text className="text-2xl font-krona text-black">AI Assistant</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-3 py-4 "
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >

        
        {messages.map(message => (
          <View
            key={message.id}
            className={`mb-3 ${
              message.isUser ? 'items-end' : 'items-start'
            }`}
          >
            <View
              className={`max-w-[80%] px-4 py-4 rounded-2xl ${
                message.isUser ? 'bg-gray-300' : 'bg-gray-600'
              }`}
            >
              <Text
                className={`font-jura ${
                  message.isUser ? 'text-black' : 'text-white'
                }`}
              >
                {message.text}
              </Text>
              
              {/* Selection Options */}
              {message.type === 'subject-selection' && message.data && (
                <View className="mt-5 space-y-2 gap-3">
                  {message.data.map((subject: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-blue-500 px-3 py-2  rounded-lg"
                      onPress={() => handleSubjectSelect(subject)}
                    >
                      <Text className="text-white font-jura text-center">
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {message.type === 'chapter-selection' && message.data && (
                <View className="mt-3 space-y-2 gap-3">
                  {message.data.map((chapter: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-green-500 px-3 py-2 rounded-lg"
                      onPress={() => handleChapterSelect(chapter)}
                    >
                      <Text className="text-white font-jura text-center">
                        {chapter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {message.type === 'topic-selection' && message.data && (
                <View className="mt-3 space-y-2 gap-3">
                  {message.data.map((topic: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      className="bg-purple-500 px-3 py-2 rounded-lg"
                      onPress={() => handleTopicSelect(topic)}
                    >
                      <Text className="text-white font-jura text-center">
                        {topic}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Quiz Options */}
              {message.type === 'quiz' && message.data && (
                <View className="mt-4">
                  <Text className="text-white font-jura font-bold mb-3">
                    {message.data.question.question}
                  </Text>
                  <View className="space-y-2 gap-2">
                    {message.data.question.options.map((option: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        className="bg-orange-500 px-4 py-3 rounded-lg border-2 border-transparent hover:border-orange-300"
                        onPress={() => handleQuizAnswer(option, message.data.questionIndex)}
                        disabled={quizState.userAnswers[message.data.questionIndex] !== undefined}
                      >
                        <Text className="text-white font-jura text-left">
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Quiz Result */}
              {message.type === 'quiz-result' && (
                <View className="mt-3 items-center">
                  <View className="bg-yellow-500 px-6 py-4 rounded-xl">
                    <Text className="text-white font-krona text-center font-bold">
                      🏆 FINAL SCORE 🏆
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

   

      {/* AI Lottie Loader from Bottom */}
      {showLoader && (
        <View className="absolute bottom-0 left-0 right-0 bg-black/50 justify-end items-center" style={{ height: '100%' }}>
          <Animated.View 
            className="bg-white rounded-t-3xl p-8 items-center w-full"
            style={{
              transform: [{ translateY: slideAnimation }],
            }}
          >
            <LottieView 
              source={require('../../assets/AI.json')} 
              style={{ width: 140, height: 140 }} 
              autoPlay 
              loop 
            />
            <Text className="text-gray-800 font-jura text-xl font-bold mt-4">
              {isThinking 
                ? 'AI is thinking...' 
                : isRequestingTeacher 
                ? 'Getting your teacher ready...' 
                : 'Loading...'
              }
            </Text>
            <Text className="text-gray-500 font-jura text-sm mt-2">
              {isThinking 
                ? 'Processing your selection and preparing content'
                : 'Please wait while we prepare everything for you'
              }
            </Text>
          </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
