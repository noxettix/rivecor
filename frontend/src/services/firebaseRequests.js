import { supabase } from "../supabase";
const TABLE = "maintenance_requests";

function mapRow(row) {
  return {
    id: row.id,
    clientName: row.client_name || "",
    plate: row.plate || "",
    description: row.description || "",
    priority: row.priority || "MEDIUM",
    problemType: row.problem_type || "GENERAL",
    status: row.status || "PENDING",
    mechanicId: row.mechanic_id || null,
    location: {
      lat: Number(row.location?.lat ?? row.lat ?? 0),
      lng: Number(row.location?.lng ?? row.lng ?? 0),
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
          console.error("Error en realtime requests:", error);
          if (onError) onError(error);
        }
      }
    )
    .subscribe((status) => {
      console.log("Estado realtime maintenance_requests:", status);
    });

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function createRequest(payload) {
  const lat = Number(payload.lat) || 0;
  const lng = Number(payload.lng) || 0;

  const insertData = {
    client_name: payload.clientName || "",
    client_id: payload.clientId || payload.clientName || "cliente_demo",
    plate: payload.plate || "",
    description: payload.description || "",
    priority: payload.priority || "MEDIUM",
    problem_type: payload.problemType || "GENERAL",
    status: "PENDING",
    mechanic_id: null,
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

export async function updateRequest(requestId, payload) {
  const updateData = {
    updated_at: new Date().toISOString(),
  };

  if (payload.clientName !== undefined) updateData.client_name = payload.clientName;
  if (payload.plate !== undefined) updateData.plate = payload.plate;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.problemType !== undefined) updateData.problem_type = payload.problemType;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.mechanicId !== undefined) updateData.mechanic_id = payload.mechanicId;
  if (payload.lat !== undefined) updateData.lat = Number(payload.lat) || 0;
  if (payload.lng !== undefined) updateData.lng = Number(payload.lng) || 0;
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

export async function acceptRequest(requestId, mechanicId) {
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
    status: "ASSIGNED",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "ASSIGNED",
      mechanic_id: mechanicId,
      tracking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error aceptando request:", error);
    throw error;
  }

  return mapRow(data);
}

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
    mechanicLat: Number(lat),
    mechanicLng: Number(lng),
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