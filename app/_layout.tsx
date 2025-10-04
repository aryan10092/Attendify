
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import '../global.css';
import { Stack } from 'expo-router';
import { useFonts, KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import { 
  Jura_300Light,
  Jura_400Regular,
  Jura_500Medium,
  Jura_600SemiBold,
  Jura_700Bold 
} from '@expo-google-fonts/jura';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  let [fontsLoaded] = useFonts({
    KronaOne_400Regular,
    Jura_300Light,
    Jura_400Regular,
    Jura_500Medium,
    Jura_600SemiBold,
    Jura_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{headerShown: false}}>
    <Stack.Screen name='index' options={{ headerShown: false }} />
    <Stack.Screen name='auth/teacher-login' options={{ headerShown: false }} />
    <Stack.Screen name='auth/student-login' options={{ headerShown: false }} />
    <Stack.Screen name='teacher/dashboard' options={{ headerShown: false }} />
    <Stack.Screen name='teacher/Allclasses' options={{ headerShown: false }} />
    <Stack.Screen name='teacher/class/[classId]' options={{ headerShown: false }} />
  </Stack>;
}