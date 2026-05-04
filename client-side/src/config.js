import { API_URL, SOCKET_URL } from './config';
// API Configuration for production and development
export const API_URL = import.meta.env.PROD 
    ? 'https://live-chat-q84d.onrender.com' 
    : `${API_URL}`;

export const SOCKET_URL = import.meta.env.PROD 
    ? 'https://live-chat-q84d.onrender.com' 
    : `${API_URL}`;

console.log(`?? Running in ${import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`?? API URL: ${API_URL}`);
