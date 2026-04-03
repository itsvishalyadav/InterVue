
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewiq-ai-a825e.firebaseapp.com",
  projectId: "interviewiq-ai-a825e",
  storageBucket: "interviewiq-ai-a825e.firebasestorage.app",
  messagingSenderId: "853951459407",
  appId: "1:853951459407:web:aaa001ce4b6e9a0652fa3a"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider()

export {auth , provider}
