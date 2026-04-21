import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const testFirebase = async () => {
  const querySnapshot = await getDocs(collection(db, "requests"));
  console.log("DATOS:", querySnapshot.docs.map(d => d.data()));
};