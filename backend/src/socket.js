import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://rivecor-production.up.railway.app';

let socketInstance = null;

export async function getSocket() {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  const token = await AsyncStorage.getItem('token');

  socketInstance = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {
      token,
    },
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}