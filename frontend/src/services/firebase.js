import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// GIKI Course Hub Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJXNlPUAbGCupagpPHxQgRk_vQS09c-6g",
  authDomain: "gikicoursehub.firebaseapp.com",
  projectId: "gikicoursehub",
  storageBucket: "gikicoursehub.firebasestorage.app",
  messagingSenderId: "1041525316740",
  appId: "1:1041525316740:web:702449a51c362d615576d1",
  measurementId: "G-6R8191YZ0X"
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
