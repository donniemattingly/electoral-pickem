import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQAuHljF6PnejIVuTgcn-IMROfG2MJIjE",
  authDomain: "electoral-pickem.firebaseapp.com",
  projectId: "electoral-pickem",
  storageBucket: "electoral-pickem.firebasestorage.app",
  messagingSenderId: "468132214354",
  appId: "1:468132214354:web:0766a6b099f66def9c118b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); 