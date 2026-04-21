import { supabase } from "../supabase";
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getDistance(a, b) {
  const ax = toNumber(a?.lat, NaN);
  const ay = toNumber(a?.lng, NaN);
  const bx = toNumber(b?.lat, NaN);
  const by = toNumber(b?.lng, NaN);

  if (
    !Number.isFinite(ax) ||
    !Number.isFinite(ay) ||
    !Number.isFinite(bx) ||
    !Number.isFinite(by)
  ) {
    return NaN;
  }

  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export async function autoAssignMechanic(requestId, requestLocation) {
  try {
    let safeRequestLocation = {
      lat: toNumber(requestLocation?.lat, NaN),
      lng: toNumber(requestLocation?.lng, NaN),
    };

    if (
      !Number.isFinite(safeRequestLocation.lat) ||
      !Number.isFinite(safeRequestLocation.lng)
    ) {
      const { data: requestRow, error: requestError } = await supabase
        .from("maintenance_requests")
        .select("lat, lng, location")
        .eq("id", requestId)
        .single();

      if (requestError) throw requestError;

      safeRequestLocation = {
        lat: toNumber(requestRow?.location?.lat ?? requestRow?.lat, NaN),
        lng: toNumber(requestRow?.location?.lng ?? requestRow?.lng, NaN),
      };
    }

    if (
      !Number.isFinite(safeRequestLocation.lat) ||
      !Number.isFinite(safeRequestLocation.lng)
    ) {
      return null;
    }

    const { data: mechanics, error } = await supabase
      .from("mechanics")
      .select("*");

    if (error) throw error;

    let best = null;
    let minDist = Infinity;

    for (const mech of mechanics || []) {
      if (!mech.available) continue;

      const mechLocation = {
        lat: toNumber(mech.lat, NaN),
        lng: toNumber(mech.lng, NaN),
      };

      if (
        !Number.isFinite(mechLocation.lat) ||
        !Number.isFinite(mechLocation.lng)
      ) {
        continue;
      }

      const dist = getDistance(safeRequestLocation, mechLocation);

      if (!Number.isFinite(dist)) continue;

      if (dist < minDist) {
        minDist = dist;
        best = mech;
      }
    }

    if (!best) {
      return null;
    }

    const { data: requestRow, error: requestFetchError } = await supabase
      .from("maintenance_requests")
      .select("tracking")
      .eq("id", requestId)
      .single();

    if (requestFetchError) throw requestFetchError;

    const tracking = {
      ...(requestRow?.tracking || {}),
      status: "ASSIGNED",
      mechanicLat: best.lat,
      mechanicLng: best.lng,
      lastUpdate: new Date().toISOString(),
    };

    const { error: updateRequestError } = await supabase
      .from("maintenance_requests")
      .update({
        mechanic_id: best.id,
        status: "ASSIGNED",
        tracking,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateRequestError) throw updateRequestError;

    const { error: updateMechanicError } = await supabase
      .from("mechanics")
      .update({
        available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", best.id);

    if (updateMechanicError) throw updateMechanicError;

    return best.id;
  } catch (error) {
    console.error("Error auto asignando:", error);
    return null;
  }
}