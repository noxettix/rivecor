import { supabase } from "../supabase";
export async function getMaintenanceRequests() {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getMaintenanceRequests:', error)
    throw error
  }

  return data || []
}

export async function createMaintenanceRequest(payload) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert([
      {
        client_id: payload.client_id,
        mechanic_id: payload.mechanic_id ?? null,
        plate: payload.plate,
        status: payload.status ?? 'PENDING',
        lat: payload.lat,
        lng: payload.lng,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error createMaintenanceRequest:', error)
    throw error
  }

  return data
}

export async function getMechanics() {
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getMechanics:', error)
    throw error
  }

  return data || []
}

export async function createMechanic(payload) {
  const { data, error } = await supabase
    .from('mechanics')
    .insert([
      {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        available: payload.available ?? true,
        expo_push_token: payload.expo_push_token ?? null,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error createMechanic:', error)
    throw error
  }

  return data
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getProfiles:', error)
    throw error
  }

  return data || []
}

export async function createProfile(payload) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error createProfile:', error)
    throw error
  }

  return data
}