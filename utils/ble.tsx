
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import BleAdvertiser from 'react-native-ble-advertiser';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import { BleManager, Device, State } from 'react-native-ble-plx';


const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  })
}


export const bleManager = new BleManager();


export const createActiveSession = async (sessionCode: string, teacherId: string, expiresAt: Date) => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .insert({
        session_code: sessionCode,
        teacher_id: teacherId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    console.log('Active session created in Supabase');
    return true;
  } catch (error) {
    console.error('Error creating active session:', error);
    return false;
  }
};

export const getActiveSession = async (sessionCode: string) => {
  try {
    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {

        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
};

export const clearActiveSession = async (sessionCode: string) => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .delete()
      .eq('session_code', sessionCode);
    
    if (error) throw error;
    console.log('Active session cleared from Supabase');
    return true;
  } catch (error) {
    console.error('Error clearing active session:', error);
    return false;
  }
};

export const cleanupExpiredSessions = async () => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
    console.log('Expired sessions cleaned up');
    return true;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return false;
  }
};

// Request permissions for Android
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    const sdk = Platform.Version as number;
    const permsToRequest: string[] = [];

    // Android 12+ runtime bluetooth permissions
    if (sdk >= 31) {
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) permsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) permsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE) permsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
    } else {
      // older Androids often need location for scan
      permsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      permsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    }

    // Deduplicate
    const uniquePerms = Array.from(new Set(permsToRequest)).filter(Boolean);

    if (uniquePerms.length === 0) return true;

    const granted = await PermissionsAndroid.requestMultiple(uniquePerms as any[]);
    const allGranted = Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);

    if (!allGranted) {
      Alert.alert('Permissions Required', 'Bluetooth and Location permissions are required for attendance scanning.');
    }

    return allGranted;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

// Wait for Bluetooth to be powered on
export const waitForBluetoothPoweredOn = async (timeout = 10000): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const startTime = Date.now();
    
    const checkState = async () => {
      try {
        const state = await bleManager.state();
        if (state === State.PoweredOn) {
          resolve(true);
          return;
        }
      } catch (error) {
        console.warn('Error checking Bluetooth state:', error);
      }
      
      // Check if timeout reached
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }
      
      // Check again in 500ms
      setTimeout(checkState, 500);
    };
    
    checkState();
  });
};

// Check if Bluetooth is enabled (legacy function for compatibility)
export const checkBluetoothState = async (): Promise<boolean> => {
  try {
    const state = await bleManager.state();
    const isOn = state === State.PoweredOn;
    
    if (!isOn) {
      Alert.alert(
        'Bluetooth Required',
        'Please enable Bluetooth to use attendance features.',
        [{ text: 'OK' }]
      );
    }
    
    return isOn;
  } catch (error) {
    console.error('Bluetooth state check error:', error);
    return false;
  }
};

// Teacher: Create session in Supabase and broadcast BLE beacon
export async function startAttendanceSession(currentClassId: string) {
  try {
    // Use the imported supabase client
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    // Check permissions and Bluetooth state
    const hasPermissions = true
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    const isBluetoothOn = await checkBluetoothState();
    if (!isBluetoothOn) {
      throw new Error('Bluetooth is not enabled');
    }

    // Generate session code
    const sessionCode = uuidv4();
    const sessionId = uuidv4();
    
    // Store session in Supabase with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    const { data, error } = await supabase.from('attendance_sessions').insert([
      { 
        id: sessionId,
        teacher_id: sessionCode, 
        code: currentClassId,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }
    ]);
    
    if (error) throw error;
    
    // Start BLE advertising
    const advertisingStarted = await startBLEAdvertising(sessionCode);
    if (!advertisingStarted) {
      console.warn('BLE advertising failed to start');
    }
    
    // Create active session in Supabase for secure fallback
    try {
      const sessionCreated = await createActiveSession(sessionCode, currentClassId, expiresAt);
      if (!sessionCreated) {
        console.warn('Failed to create active session in Supabase, but continuing with BLE advertising');
      } else {
        console.log('Active session created in Supabase successfully');
      }
    } catch (error) {
      console.warn('Error creating active session in Supabase:', error);
      console.log('Continuing with BLE advertising only...');
      
      // Try to create a simple test session in attendance_sessions table
      try {
        console.log('Attempting to create test session in attendance_sessions table...');
        const { error: testError } = await supabase
          .from('attendance_sessions')
          .insert({
            id: sessionId,
            teacher_id: sessionCode,
            code: currentClassId,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });
        
        if (testError) {
          console.error('Failed to create test session:', testError);
        } else {
          console.log('Test session created in attendance_sessions table');
        }
      } catch (testErr) {
        console.error('Error creating test session:', testErr);
      }
    }
    
    console.log(`Attendance session started: ${sessionCode}`);
    return { sessionId, sessionCode, expiresAt };
    
  } catch (error) {
    console.error('Failed to start attendance session:', error);
    throw error;
  }
}

// Teacher: Start BLE advertising with session code
export async function startBLEAdvertising(sessionCode: string): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') {
      console.warn('BLE advertising is only supported on Android with react-native-ble-advertiser');
      return false;
    }
    console.log(`Starting BLE advertising for session: ${sessionCode}`);
    const isBluetoothOn = await checkBluetoothState();
    if (!isBluetoothOn) {
      throw new Error('Bluetooth is not enabled');
    }
    // Request advertising permission
    if (Platform.OS === 'android') {
      const advertiseGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
      );
      if (advertiseGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Required', 'Bluetooth Advertise permission is required.');
        return false;
      }
    }
    // Use a fixed UUID for the service (should match scanner)

    const SERVICE_UUID  = "12345678-1234-5678-1234-56789abcdef0";

    // Try to start BLE advertising with device name

    try {
      console.log('Attempting BLE advertising with device name...');
      console.log('Session code to advertise:', sessionCode);
      console.log('Device name to advertise:', `ATTEND_${sessionCode}`);
      
      await BleAdvertiser.broadcast(
        `ATTEND_${sessionCode}`, // device name
        [],         // service UUIDs - empty array to avoid type issues
        { 
          includeDeviceName: true
        }
      );
      console.log('BLE advertising started with device name');
      return true;
    } catch (err) {
      console.error('BLE advertise failed with device name:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      // Fallback to basic advertising
      try {
        console.log('Attempting BLE advertising with basic options...');
        await BleAdvertiser.broadcast(
          sessionCode, // just the session code as name
          [],         // no service UUIDs
          {}
        );
        console.log('BLE advertising started with basic options');
        return true;
      } catch (fallbackErr) {
        console.error('BLE advertise fallback also failed:', fallbackErr);
        console.error('Fallback error details:', JSON.stringify(fallbackErr, null, 2));
        
        // Try even simpler approach
        try {
          console.log('Attempting minimal BLE advertising...');
          await BleAdvertiser.broadcast(
            sessionCode, // just the session code as name
            [],         // no service UUIDs
            undefined
          );
          console.log('BLE advertising started with minimal options');
          return true;
        } catch (minimalErr) {
          console.error('All BLE advertising attempts failed:', minimalErr);
          console.error('Minimal error details:', JSON.stringify(minimalErr, null, 2));
          return false;
        }
      }
    }

  } catch (error) {
    console.error('BLE advertising top-level error:', error);
    return false;
  }
}

// Teacher: Stop BLE advertising
export async function stopBLEAdvertising(sessionCode?: string): Promise<void> {
  try {
    if (Platform.OS !== 'android') return;
    
    // Stop BLE advertising
    try {
      await BleAdvertiser.stopBroadcast();
      console.log('BLE advertising stopped');
    } catch (error) {
      console.warn('Error stopping BLE advertising:', error);
    }
    
    // Clear active session from Supabase if session code provided
    if (sessionCode) {
      await clearActiveSession(sessionCode);
    }
    
  } catch (error) {
    console.error('Error stopping BLE advertising:', error);
  }
}

// Student: Scan for BLE beacons (sessions)
export async function scanForAttendanceSessions(
  onSessionFound: (sessionData: { code: string; device: any; isValid: boolean }) => void,
  onError?: (error: string) => void
) {
  let scanTimeout: any;
  let foundSession = false;
  
  // Define service UUID for scanning
  const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  
  try {
    // Check permissions first
    const hasPermissions = true
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    // Wait for Bluetooth to be powered on
    const isBluetoothOn = await waitForBluetoothPoweredOn(5000);
    if (!isBluetoothOn) {
      throw new Error('Bluetooth is not enabled or not ready');
    }

    console.log('Starting BLE scan for attendance sessions...');
    
    // Start scanning for devices with proper options
    // Using allowDuplicates: false to avoid duplicate callbacks for the same device
    bleManager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: any) => {
      if (error) {
        console.warn('BLE scan error:', error);
        if (onError) onError(error.message);
        return;
      }

      if (device) {
        console.log('Found device:', {
          name: device.name,
          id: device.id,
          rssi: device.rssi,
          isConnectable: device.isConnectable,
          serviceUUIDs: device.serviceUUIDs,
          manufacturerData: device.manufacturerData,
          serviceData: device.serviceData
        });
        
        let sessionCode: string | null = null;
        let isValidFormat = false;
        
        // 1) Check service UUIDs first (most reliable)
        if (device.serviceUUIDs && device.serviceUUIDs.includes(SERVICE_UUID)) {
          console.log('Device has matching service UUID:', SERVICE_UUID);
          
          // Try to get session code from service data
          if (device.serviceData && device.serviceData[SERVICE_UUID]) {
            try {
              const serviceDataBuffer = Buffer.from(device.serviceData[SERVICE_UUID], 'base64');
              sessionCode = serviceDataBuffer.toString('utf8');
              console.log('Session code from service data:', sessionCode);
            } catch (err) {
              console.warn('Error decoding service data:', err);
            }
          }
        }
        
        // 2) Check manufacturer data (second priority)
        if (!sessionCode && device.manufacturerData) {
          try {
            const manufacturerBuffer = Buffer.from(device.manufacturerData, 'base64');
            const decodedData = manufacturerBuffer.toString('utf8');
            
            // Check if it looks like a UUID
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decodedData)) {
              sessionCode = decodedData;
              console.log('Session code from manufacturer data:', sessionCode);
            }
          } catch (err) {
            console.warn('Error decoding manufacturer data:', err);
          }
        }
        
        // 3) Fallback to device name pattern (least reliable)
        if (!sessionCode && device.name && device.name.startsWith('ATTEND_')) {
          sessionCode = device.name.replace('ATTEND_', '');
          console.log('Session code from device name:', sessionCode);
        }
        
        // Validate and process the found session code
        if (sessionCode) {
          isValidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionCode);
          console.log('Session code validation:', { sessionCode, isValidFormat });
          
          if (isValidFormat) {
            console.log('Found valid attendance session device:', {
              sessionCode,
              deviceName: device.name,
              rssi: device.rssi,
              source: device.serviceUUIDs?.includes(SERVICE_UUID) ? 'service' : 
                     device.manufacturerData ? 'manufacturer' : 'name'
            });
            
            onSessionFound({
              code: sessionCode,
              device,
              isValid: true,
            
            });
            
            foundSession = true;
            clearTimeout(scanTimeout);
            stopScan();
          }
        }
      }
    });

    // Fallback: Check for active sessions in Supabase after a delay
    setTimeout(async () => {
      if (!foundSession) {
        console.log('BLE scan found no attendance sessions, checking Supabase for active sessions...');
        
        try {
          // Try active_sessions table first
          let activeSessions = null;
          let error = null;
          
          try {
            const result = await supabase
              .from('active_sessions')
              .select('*')
              .gte('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1);
            
            activeSessions = result.data;
            error = result.error;
          } catch (activeSessionsError) {
            console.log('active_sessions table not found, trying attendance_sessions table...');
            
            // Fallback to attendance_sessions table
            const result = await supabase
              .from('attendance_sessions')
              .select('*')
              .gte('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1);
            
            activeSessions = result.data;
            error = result.error;
          }
          
          if (error) {
            console.error('Error fetching active sessions:', error);
            return;
          }
          
          if (activeSessions && activeSessions.length > 0) {
            const session = activeSessions[0];
            const sessionCode = session.session_code || session.code;
            console.log('Found active session in Supabase:', sessionCode);
            
            const mockDevice = {
              name: `ATTEND_${sessionCode}`,
              id: 'supabase-fallback-device',
              rssi: -50
            };
            
            onSessionFound({
              code: sessionCode,
              device: mockDevice,
              isValid: true
            });
            
            foundSession = true;
            stopScan();
          } else {
            console.log('No active sessions found in Supabase');
          }
        } catch (error) {
          console.error('Error checking Supabase for active sessions:', error);
        }
      }
    }, 3000); // 3 second delay to allow BLE scanning first

    // Stop scanning after 30 seconds
    scanTimeout = setTimeout(() => {
      if (!foundSession) {
        console.log('Scan timeout reached - no valid sessions found');
        stopScan();
        if (onError) onError('Scan timeout - no sessions found. Make sure the teacher has started a session and you are within Bluetooth range.');
      }
    }, 30000);

  } catch (error: any) {
    console.error('BLE scanning error:', error);
    if (onError) onError(error.message);
    throw error;
  }
}

// Student: Submit attendance to Supabase with security validation
export async function submitAttendance(
  sessionCode: string, 
  studentId: string, 
  supabase: any,
  wasScanned: boolean = false
) {
  try {
    console.log("yaaaay")
    // Security: Only allow BLE-scanned codes
    if (!wasScanned) {
      throw new Error('Invalid session code. Please scan via Bluetooth.');
    }

    // Validate session code exists and is not expired
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, created_at, expires_at')
      .eq('teacher_id', sessionCode)
      .single();
      
    if (sessionError || !session) {
      throw new Error('Invalid or expired session code');
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now > expiresAt) {
      throw new Error('Session has expired');
    }

    // Check for duplicate attendance
    const { data: existing, error: logError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', studentId)
      .single();
      
    if (existing) {
      throw new Error('Attendance already marked for this session');
    }

    // Submit attendance
    const { error: submitError } = await supabase.from('attendance_logs').insert([
      { 
        session_id: session.id, 
        student_id: studentId,
        created_at: new Date().toISOString(),
     
      }
    ]);
    
    if (submitError) throw submitError;
    
    console.log(`✅ Attendance marked successfully for student ${studentId}`);
    console.log(`📊 Session ${session.id} now has attendance from student ${studentId}`);
    return { success: true, sessionId: session.id };
    
  } catch (error) {
    console.error('Attendance submission error:', error);
    throw error;
  }
}

// Get attendance statistics for a session
export async function getAttendanceStats(sessionId: string, supabase: any) {
  try {
    const { data: logs, error } = await supabase
      .from('attendance_logs')
      .select('student_id, created_at')
      .eq('session_id', sessionId);
      
    if (error) throw error;
    
    return {
      totalAttendees: logs?.length || 0,
      attendees: logs || []
    };
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    throw error;
  }
}

// Get real-time attendance count for a session (for teacher dashboard)
export async function getRealtimeAttendanceCount(sessionCode: string, supabase: any) {
  try {
    // First get the session ID
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('code', sessionCode)
      .single();
      
    if (sessionError || !session) {
      return { count: 0, error: 'Session not found' };
    }
    
    // Get attendance count
    const { count, error: countError } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);
      
    if (countError) {
      return { count: 0, error: countError.message };
    }
    
    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error getting real-time attendance count:', error);
    return { count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


export function stopScan() {
  try {
    bleManager.stopDeviceScan();
    console.log('BLE scan stopped');
  } catch (error) {
    console.error('Error stopping BLE scan:', error);
  }
}

// Cleanup BLE manager resources
export function destroyBLEManager() {
  try {
    bleManager.destroy();
    console.log('BLE manager destroyed');
  } catch (error) {
    console.error('Error destroying BLE manager:', error);
  }
}

export function generateSessionCode() {
  return uuidv4();
}

export default {
  bleManager,
  startAttendanceSession,
  scanForAttendanceSessions,
  submitAttendance,
  stopScan,
  destroyBLEManager,
  generateSessionCode,
  requestBluetoothPermissions,
  checkBluetoothState,
  waitForBluetoothPoweredOn,
  startBLEAdvertising,
  stopBLEAdvertising,
  getAttendanceStats,
  getRealtimeAttendanceCount,
  cleanupExpiredSessions,
  createActiveSession,
  getActiveSession,
  clearActiveSession,
  sendStudentPresence
};

export interface StudentPresencePayload {
  studentId: string;
  classId: string;
  sessionCode: string;
}

// Student: Send presence data via BLE advertising (alternative to scanning approach)
export async function sendStudentPresence(
  payload: StudentPresencePayload, 
  durationMs: number = 5000
): Promise<void> {
  try {
    console.log('Sending student presence:', payload);
    
    // Check permissions first
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    // Check if Bluetooth is enabled
    const isBluetoothOn = await waitForBluetoothPoweredOn(5000);
    if (!isBluetoothOn) {
      throw new Error('Bluetooth is not enabled or not ready');
    }

    // Validate the session exists in the database first
    const activeSession = await getActiveSession(payload.sessionCode);
    if (!activeSession) {
      // Try to find in attendance_sessions table as fallback
      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('code', payload.classId)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error || !session) {
        throw new Error('Invalid session code or session has expired');
      }
    }

    if (Platform.OS !== 'android') {
      console.warn('Student presence broadcasting is only supported on Android');
      // For non-Android platforms, we'll submit directly to database
      await submitAttendanceDirectly(payload);
      return;
    }

    // Create a unique broadcast name for this student
    const broadcastName = `STUDENT_${payload.studentId}_${payload.classId}`;
    
    try {
      console.log('Starting student presence broadcast...');
      
      // Start broadcasting student presence
      await BleAdvertiser.broadcast(
        broadcastName,
        [],
        {
          includeDeviceName: true
        }
      );
      
      console.log(`Student presence broadcast started for ${durationMs}ms`);
      
      // Stop broadcasting after specified duration
      setTimeout(async () => {
        try {
          await BleAdvertiser.stopBroadcast();
          console.log('Student presence broadcast stopped');
          
          // Submit attendance to database as backup
          await submitAttendanceDirectly(payload);
        } catch (error) {
          console.error('Error stopping student broadcast:', error);
        }
      }, durationMs);
      
    } catch (error) {
      console.error('BLE broadcast failed, submitting directly to database:', error);
      // Fallback to direct database submission
      await submitAttendanceDirectly(payload);
    }
    
  } catch (error) {
    console.error('Error sending student presence:', error);
    throw error;
  }
}

// Helper function to submit attendance directly to database (fallback)
async function submitAttendanceDirectly(payload: StudentPresencePayload): Promise<void> {
  try {
    console.log('Submitting attendance directly to database...');
    
    // Find the active session
    let session = await getActiveSession(payload.sessionCode);
    let sessionId = null;
    
    if (session) {
      sessionId = session.id;
    } else {
      // Try attendance_sessions table
      const { data: attendanceSession, error } = await supabase
        .from('attendance_sessions')
        .select('id, expires_at')
        .eq('code', payload.classId)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error || !attendanceSession) {
        throw new Error('No active session found for this class');
      }
      
      sessionId = attendanceSession.id;
    }
    
    // Check for duplicate attendance
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', payload.studentId)
      .single();
    
    if (existing) {
      throw new Error('Attendance already marked for this session');
    }
    
    // Submit attendance
    const { error: submitError } = await supabase
      .from('attendance_logs')
      .insert([
        {
          session_id: sessionId,
          student_id: payload.studentId,
          created_at: new Date().toISOString(),
        }
      ]);
    
    if (submitError) throw submitError;
    
    console.log(`✅ Attendance submitted successfully for student ${payload.studentId}`);
    
  } catch (error) {
    console.error('Error submitting attendance directly:', error);
    throw error;
  }
}