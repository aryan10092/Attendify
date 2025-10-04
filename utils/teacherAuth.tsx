import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface TeacherData {
  id: string;
  name: string;
  email: string;
  teacherId: string;
  department?: string;
  subject?: string;
}

/**
 * Check if a teacher is currently logged in
 */
export const isTeacherLoggedIn = async (): Promise<boolean> => {
  try {
    const teacherId = await AsyncStorage.getItem('teacher_id');
    const teacherName = await AsyncStorage.getItem('teacher_name');
    console.log('isTeacherLoggedIn check:', { teacherId, teacherName });
    return !!(teacherId && teacherName);
  } catch (error) {
    console.error('Error checking teacher login status:', error);
    return false;
  }
};

/**
 * Get teacher data from AsyncStorage and Supabase
 */
export const getTeacherData = async (): Promise<TeacherData | null> => {
  try {
    // First try to get from AsyncStorage (from login)
    const teacherName = await AsyncStorage.getItem('teacher_name');
    const teacherEmail = await AsyncStorage.getItem('teacher_email');
    const teacherId = await AsyncStorage.getItem('teacher_id');
    const teacherDepartment = await AsyncStorage.getItem('teacher_department');
    const teacherSubject = await AsyncStorage.getItem('teacher_subject');

    if (teacherName && teacherEmail && teacherId) {
      // We have complete data from login
      return {
        id: teacherId,
        name: teacherName,
        email: teacherEmail,
        teacherId: teacherId,
       
        subject: teacherSubject || undefined
      };
    }

    // If not in AsyncStorage, try to fetch from Supabase using stored teacher_id
    if (teacherId) {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();

      if (error) throw error;

      if (data) {
        // Update AsyncStorage with fresh data
        await AsyncStorage.setItem('teacher_name', data.name);
        await AsyncStorage.setItem('teacher_email', data.email);
        if (data.department) {
          await AsyncStorage.setItem('teacher_department', data.department);
        }
        if (data.subject) {
          await AsyncStorage.setItem('teacher_subject', data.subject);
        }

        return {
          id: data.teacher_id,
          name: data.name,
          email: data.email,
          teacherId: data.teacher_id,
          
          subject: data.subject
        };
      }
    }

    return null;

  } catch (error) {
    console.error('Error getting teacher data:', error);
    return null;
  }
};

/**
 * Logout teacher and clear all stored data
 */
export const logoutTeacher = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'teacher_id',
      'teacher_name',
      'teacher_email',
      'teacher_department',
      'teacher_subject'
    ]);
  } catch (error) {
    console.error('Error logging out teacher:', error);
    throw error;
  }
};

/**
 * Refresh teacher data from Supabase and update AsyncStorage
 */
export const refreshTeacherData = async (): Promise<TeacherData | null> => {
  try {
    const teacherId = await AsyncStorage.getItem('teacher_id');
    
    if (!teacherId) {
      throw new Error('No teacher ID found in storage');
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('teacher_id', teacherId)
      .single();

    if (error) throw error;

    if (data) {
      // Update AsyncStorage with fresh data
      await AsyncStorage.setItem('teacher_name', data.name);
      await AsyncStorage.setItem('teacher_email', data.email);
      if (data.department) {
        await AsyncStorage.setItem('teacher_department', data.department);
      }
      if (data.subject) {
        await AsyncStorage.setItem('teacher_subject', data.subject);
      }

      return {
        id: data.teacher_id,
        name: data.name,
        email: data.email,
        teacherId: data.teacher_id,
       
        subject: data.subject
      };
    }

    return null;

  } catch (error) {
    console.error('Error refreshing teacher data:', error);
    throw error;
  }
};

/**
 * Validate teacher exists in Supabase database
 */
export const validateTeacherInDatabase = async (teacherId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher_id', teacherId)
      .single();

    if (error) {
      // If error is 'No rows returned', teacher doesn't exist
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;

  } catch (error) {
    console.error('Error validating teacher in database:', error);
    return false;
  }
};

/**
 * Get teacher's classes from Supabase
 */
export const getTeacherClasses = async (teacherId?: string): Promise<any[]> => {
  try {
    let finalTeacherId = teacherId;
    
    if (!finalTeacherId) {
      const storedTeacherId = await AsyncStorage.getItem('teacher_id');
      finalTeacherId = storedTeacherId || undefined;
    }

    if (!finalTeacherId) {
      throw new Error('No teacher ID available');
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', finalTeacherId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    throw error;
  }
};