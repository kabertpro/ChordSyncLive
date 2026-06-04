import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, push } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC1I3tNkzVUGmMqi7cDXv_6mgUcfFCuMEg",
  authDomain: "chordsynclive.firebaseapp.com",
  projectId: "chordsynclive",
  storageBucket: "chordsynclive.firebasestorage.app",
  messagingSenderId: "777081343996",
  appId: "1:777081343996:web:92bd69bdc28529aba12c79"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

export { rtdb, ref, set, onValue, update, push };