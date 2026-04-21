import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function getDistance(a, b) {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

async function sendExpoPush(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data,
      }),
    });
  } catch (error) {
    console.error("Error enviando push Expo:", error);
  }
}

export async function autoAssignMechanic(requestId, requestLocation) {
  try {
    const snap = await getDocs(collection(db, "mechanics"));

    let best = null;
    let minDist = Infinity;

    snap.forEach((docu) => {
      const mech = docu.data();

      if (!mech.available || !mech.location) return;

      const dist = getDistance(requestLocation, mech.location);

      if (dist < minDist) {
        minDist = dist;
        best = {
          id: docu.id, // <- ESTE id debe ser el UID real del mecánico
          ...mech,
        };
      }
    });

    if (!best) {
      console.log("No hay mecánicos disponibles");
      return null;
    }

    // Asignar request al UID real del mecánico
    await updateDoc(doc(db, "requests", requestId), {
      mechanicId: best.id,
      status: "ASSIGNED",
      "tracking.status": "ASSIGNED",
      "tracking.lastUpdate": serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Bloquear mecánico mientras está ocupado
    await updateDoc(doc(db, "mechanics", best.id), {
      available: false,
      updatedAt: serverTimestamp(),
    });

    // Guardar notificación interna
    await addDoc(collection(db, "notifications"), {
      type: "NEW_ASSIGNMENT",
      mechanicId: best.id,
      requestId,
      message: "Nueva solicitud asignada",
      read: false,
      createdAt: serverTimestamp(),
    });

    // Buscar push token en users/{uid}
    const userSnap = await getDoc(doc(db, "users", best.id));

    if (userSnap.exists()) {
      const userData = userSnap.data();

      await sendExpoPush(
        userData.expoPushToken,
        "Nueva solicitud asignada",
        "Tienes una nueva orden disponible en Rivecor.",
        { requestId, type: "NEW_ASSIGNMENT" }
      );
    }

    console.log("Asignado a:", best.name || best.id);

    return best.id;
  } catch (error) {
    console.error("Error auto asignando:", error);
    return null;
  }
}