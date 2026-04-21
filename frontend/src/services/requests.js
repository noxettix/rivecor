import { supabase } from "../supabase";
const TABLE = "maintenance_requests";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapRow(row) {
  return {
    id: row.id,
    clientName: row.client_name || "",
    clientId: row.client_id || "",
    plate: row.plate || "",
    description: row.description || "",
    priority: row.priority || "MEDIUM",
    problemType: row.problem_type || "GENERAL",
    status: row.status || "PENDING",
    mechanicId: row.mechanic_id || "sin_asignar",
    location: {
      lat: toNumber(row.location?.lat ?? row.lat, 0),
      lng: toNumber(row.location?.lng ?? row.lng, 0),
    },
    tracking: {
      mechanicLat: row.tracking?.mechanicLat ?? null,
      mechanicLng: row.tracking?.mechanicLng ?? null,
      status: row.tracking?.status ?? row.status ?? "PENDING",
      lastUpdate: row.tracking?.lastUpdate
        ? new Date(row.tracking.lastUpdate)
        : null,
    },
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

async function fetchRequests() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo requests:", error);
    throw error;
  }

  return (data || []).map(mapRow);
}

// 🔥 LISTEN (TIEMPO REAL)
export function listenRequests(callback, onError) {
  let active = true;

  fetchRequests()
    .then((items) => {
      if (active) callback(items);
    })
    .catch((error) => {
      console.error("Error cargando requests:", error);
      if (onError) onError(error);
    });

  const channel = supabase
    .channel("maintenance_requests_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      async () => {
        try {
          const items = await fetchRequests();
          if (active) callback(items);
        } catch (error) {
          console.error("Error escuchando requests:", error);
          if (onError) onError(error);
        }
      }
    )
    .subscribe((status) => {
      console.log("Realtime maintenance_requests:", status);
    });

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// 🔥 CREAR SOLICITUD
export async function createRequest(payload) {
  const lat = toNumber(payload.lat, 0);
  const lng = toNumber(payload.lng, 0);

  const insertData = {
    client_name: payload.clientName || "",
    client_id: payload.clientId || "",
    plate: payload.plate || "",
    description: payload.description || "",
    priority: payload.priority || "MEDIUM",
    problem_type: payload.problemType || "GENERAL",
    status: "PENDING",
    mechanic_id: "sin_asignar",
    lat,
    lng,
    location: {
      lat,
      lng,
    },
    tracking: {
      mechanicLat: null,
      mechanicLng: null,
      status: "PENDING",
      lastUpdate: null,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error("Error creando request:", error);
    throw error;
  }

  return mapRow(data);
}

// 🔥 UPDATE GENÉRICO
export async function updateRequest(requestId, payload) {
  const updateData = {
    updated_at: new Date().toISOString(),
  };

  if (payload.clientName !== undefined) updateData.client_name = payload.clientName;
  if (payload.clientId !== undefined) updateData.client_id = payload.clientId;
  if (payload.plate !== undefined) updateData.plate = payload.plate;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.problemType !== undefined) updateData.problem_type = payload.problemType;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.mechanicId !== undefined) updateData.mechanic_id = payload.mechanicId;
  if (payload.lat !== undefined) updateData.lat = toNumber(payload.lat, 0);
  if (payload.lng !== undefined) updateData.lng = toNumber(payload.lng, 0);
  if (payload.location !== undefined) updateData.location = payload.location;
  if (payload.tracking !== undefined) updateData.tracking = payload.tracking;

  const { data, error } = await supabase
    .from(TABLE)
    .update(updateData)
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando request:", error);
    throw error;
  }

  return mapRow(data);
}

// 🔥 ASIGNAR MECÁNICO
export async function assignMechanic(requestId, mechanicId) {
  const finalMechanicId = mechanicId || "sin_asignar";

  const { data: currentRow, error: fetchError } = await supabase
    .from(TABLE)
    .select("tracking")
    .eq("id", requestId)
    .single();

  if (fetchError) {
    console.error("Error obteniendo request:", fetchError);
    throw fetchError;
  }

  const tracking = {
    ...(currentRow?.tracking || {}),
    mechanicLat: -33.44,
    mechanicLng: -70.64,
    status: "ON_THE_WAY",
    lastUpdate: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      mechanic_id: finalMechanicId,
      status: "IN_PROGRESS",
      tracking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error asignando mecánico:", error);
    throw error;
  }

  return mapRow(data);
}

// 🔥 ACTUALIZAR POSICIÓN (GPS / SIMULACIÓN)
export async function updateMechanicLocation(requestId, lat, lng) {
  const { data: currentRow, error: fetchError } = await supabase
    .from(TABLE)
    .select("tracking")
    .eq("id", requestId)
    .single();

  if (fetchError) {
    console.error("Error obteniendo tracking:", fetchError);
    throw fetchError;
  }

  const tracking = {
    ...(currentRow?.tracking || {}),
    mechanicLat: toNumber(lat, 0),
    mechanicLng: toNumber(lng, 0),
    lastUpdate: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      tracking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando ubicación del mecánico:", error);
    throw error;
  }

  return mapRow(data);
}

// 🔥 SIMULACIÓN DE MOVIMIENTO (TIPO UBER)
export function simulateMovement(requestId) {
  let lat = -33.44;
  let lng = -70.64;

  const intervalId = setInterval(async () => {
    try {
      lat += 0.0005;
      lng += 0.0005;

      await updateMechanicLocation(requestId, lat, lng);
    } catch (error) {
      console.error("Error simulando movimiento:", error);
    }
  }, 2000);

  return () => clearInterval(intervalId);
}