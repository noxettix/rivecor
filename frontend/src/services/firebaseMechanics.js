import { supabase } from "../supabase";

const TABLE = "mechanics";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapMechanic(row) {
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    available: Boolean(row.available),
    location:
      row.lat != null && row.lng != null
        ? {
            lat: toNumber(row.lat, 0),
            lng: toNumber(row.lng, 0),
          }
        : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

async function fetchMechanics() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo mecánicos:", error);
    throw error;
  }

  return (data || []).map(mapMechanic);
}

export function listenMechanics(callback, onError) {
  let active = true;

  fetchMechanics()
    .then((items) => {
      if (active) callback(items);
    })
    .catch((error) => {
      console.error("Error cargando mecánicos:", error);
      if (onError) onError(error);
    });

  const channel = supabase
    .channel("mechanics_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      async () => {
        try {
          const items = await fetchMechanics();
          if (active) callback(items);
        } catch (error) {
          console.error("Error realtime mecánicos:", error);
          if (onError) onError(error);
        }
      }
    )
    .subscribe((status) => {
      console.log("Estado realtime mechanics:", status);
    });

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function updateMechanicAvailability(mechanicId, available) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      available: Boolean(available),
      updated_at: new Date().toISOString(),
    })
    .eq("id", mechanicId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando disponibilidad:", error);
    throw error;
  }

  return mapMechanic(data);
}