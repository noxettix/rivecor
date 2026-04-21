import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDEUH9uhawqQhkTTuMeIIymSfsROXO0uQA",
  authDomain: "rivecor.firebaseapp.com",
  projectId: "rivecor",
  storageBucket: "rivecor.firebasestorage.app",
  messagingSenderId: "641809564038",
  appId: "1:641809564038:web:XXXX",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);