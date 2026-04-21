import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export function simulateMovement(requestId) {
  let lat = -33.44;
  let lng = -70.64;

  setInterval(async () => {
    lat += 0.001;
    lng += 0.001;

    await updateDoc(doc(db, "requests", requestId), {
      "tracking.mechanicLat": lat,
      "tracking.mechanicLng": lng,
    });

  }, 2000);
}