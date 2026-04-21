import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

function MapAutoFit({ clientPos, mechanicPos }) {
  const map = useMap();

  useEffect(() => {
    if (!clientPos && !mechanicPos) return;

    const points = [];
    if (clientPos) points.push(clientPos);
    if (mechanicPos) points.push(mechanicPos);

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, clientPos, mechanicPos]);

  return null;
}

// 🔥 interpolación suave
function interpolate(start, end, t) {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

export default function TrackingMap({ clientLocation, mechanicLocation }) {
  const [route, setRoute] = useState([]);
  const [animatedPos, setAnimatedPos] = useState(null);

  const prevPosRef = useRef(null);
  const animationRef = useRef(null);

  const clientPos = useMemo(() => {
    if (!clientLocation) return null;
    return [Number(clientLocation.lat), Number(clientLocation.lng)];
  }, [clientLocation]);

  const mechanicPos = useMemo(() => {
    if (!mechanicLocation) return null;
    return [Number(mechanicLocation.lat), Number(mechanicLocation.lng)];
  }, [mechanicLocation]);

  const center = mechanicPos || clientPos || [-33.45, -70.66];

  // 🔥 obtener ruta
  useEffect(() => {
    const fetchRoute = async () => {
      if (!clientPos || !mechanicPos) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${mechanicPos[1]},${mechanicPos[0]};${clientPos[1]},${clientPos[0]}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) return;

        const coords = data.routes[0].geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );

        setRoute(coords);
      } catch (err) {
        console.error("Error ruta:", err);
      }
    };

    fetchRoute();
  }, [clientPos, mechanicPos]);

  // 🔥 animación tipo Uber
  useEffect(() => {
    if (!mechanicPos) return;

    const start = prevPosRef.current || mechanicPos;
    const end = mechanicPos;

    let startTime = null;
    const duration = 1000; // 1 segundo animación

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);

      const newPos = interpolate(start, end, progress);
      setAnimatedPos(newPos);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevPosRef.current = end;
      }
    }

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [mechanicPos]);

  return (
    <div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 400, width: "100%", borderRadius: 16 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapAutoFit clientPos={clientPos} mechanicPos={animatedPos} />

        {/* Cliente */}
        {clientPos && (
          <CircleMarker
            center={clientPos}
            radius={10}
            pathOptions={{
              color: "#000",
              fillColor: "#facc15",
              fillOpacity: 1,
            }}
          >
            <Popup>Cliente</Popup>
          </CircleMarker>
        )}

        {/* Mecánico animado */}
        {animatedPos && (
          <CircleMarker
            center={animatedPos}
            radius={10}
            pathOptions={{
              color: "#facc15",
              fillColor: "#000",
              fillOpacity: 1,
            }}
          >
            <Popup>Mecánico en movimiento</Popup>
          </CircleMarker>
        )}

        {/* Ruta */}
        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#facc15",
              weight: 5,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}