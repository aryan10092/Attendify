import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface StudentData {
  name: string;
  rollNo: string;
  batch: string;
  email: string;
  id: string;
}

// Check if student is logged in
export const isStudentLoggedIn = async (): Promise<boolean> => {
  try {
    const studentId = await AsyncStorage.getItem('student_id');
    const studentName = await AsyncStorage.getItem('student_name');
    return !!(studentId && studentName);
  } catch (error) {
    console.error('Error checking student login status:', error);
    return false;
  }
};

// Get student data from AsyncStorage and Supabase
export const getStudentData = async (): Promise<StudentData | null> => {
  try {
    // First try to get from AsyncStorage (from login)
    const studentName = await AsyncStorage.getItem('student_name');
    const studentEmail = await AsyncStorage.getItem('student_email');
    const studentRoll = await AsyncStorage.getItem('student_roll');
    const studentBatch = await AsyncStorage.getItem('student_batch');
    const studentId = await AsyncStorage.getItem('student_id');

    if (studentName && studentEmail && studentRoll && studentBatch && studentId) {
      // We have complete data from login
      return {
        name: studentName,
        rollNo: studentRoll,
        batch: studentBatch,
        email: studentEmail,
        id: studentId
      };
    }

    // If not in AsyncStorage, try to fetch from Supabase using stored student_id
    if (studentId) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error) throw error;

      if (data) {
        // Update AsyncStorage with fresh data
        await AsyncStorage.setItem('student_name', data.name);
        await AsyncStorage.setItem('student_email', data.email);
        await AsyncStorage.setItem('student_roll', data.roll_number);
        await AsyncStorage.setItem('student_batch', data.batch);

        return {
          name: data.name,
          rollNo: data.roll_number,
          batch: data.batch,
          email: data.email,
          id: data.student_id
        };
      }
    }

    return null;

  } catch (error) {
    console.error('Error getting student data:', error);
    return null;
  }
};

// Logout student
export const logoutStudent = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'student_name',
      'student_email',
      'student_roll',
      'student_batch',
      'student_id'
    ]);
  } catch (error) {
    console.error('Error during student logout:', error);
    throw error;
  }
};

// Validate student data exists in Supabase
export const validateStudentInDatabase = async (studentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', studentId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error validating student in database:', error);
    return false;
  }
};

// Refresh student data from Supabase
export const refreshStudentData = async (): Promise<StudentData | null> => {
  try {
    const studentId = await AsyncStorage.getItem('student_id');
    if (!studentId) return null;

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error) throw error;

    if (data) {
      // Update AsyncStorage with fresh data
      await AsyncStorage.setItem('student_name', data.name);
      await AsyncStorage.setItem('student_email', data.email);
      await AsyncStorage.setItem('student_roll', data.roll_number);
      await AsyncStorage.setItem('student_batch', data.batch);

      return {
        name: data.name,
        rollNo: data.roll_number,
        batch: data.batch,
        email: data.email,
        id: data.student_id
      };
    }

    return null;
  } catch (error) {
    console.error('Error refreshing student data:', error);
    return null;
  }
};