// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCE-u8mGkZdMp31RbXx3Wim7EfYEn9Ehs8",
  authDomain: "monetra-app-8ec99.firebaseapp.com",
  projectId: "monetra-app-8ec99",
  storageBucket: "monetra-app-8ec99.firebasestorage.app",
  messagingSenderId: "1028234708773",
  appId: "1:1028234708773:web:c62a5051b1cf1046d6bccc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Servicios exportados (se importan donde se necesiten)
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();