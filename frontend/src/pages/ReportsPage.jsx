import api from "../services/api";
import {
  Download,
  BarChart3,
  Truck,
  Wrench,
  DollarSign,
  User,
} from "lucide-react";

export default function ReportsPage() {
  const download = async (endpoint, filename) => {
    try {
      const res = await api.get(`/reports/${endpoint}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error descargando reporte");
      console.log(err);
    }
  };

  return (
    <div className="p-6 text-white space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Reportes Excel</h1>
        <p className="text-sm text-zinc-400">
          Descarga reportes actualizados en tiempo real
        </p>
      </div>

      {/* REPORTE COMPLETO */}
      <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 flex justify-between items-center">

        <div className="flex items-center gap-4">
          <div className="bg-green-500/20 p-3 rounded-xl">
            <BarChart3 size={24} className="text-green-400" />
          </div>

          <div>
            <p className="text-lg font-semibold">Reporte completo</p>
            <p className="text-sm text-zinc-300">
              Las 4 hojas en un solo archivo Excel con todas las métricas
            </p>
          </div>
        </div>

        <button
          onClick={() => download("full", "Rivecor_Reporte_Completo.xlsx")}
          className="flex items-center gap-2 bg-green-500 px-5 py-2 rounded-xl hover:bg-green-400 transition"
        >
          <Download size={16} />
          Descargar Excel
        </button>
      </div>

      {/* TITULO */}
      <p className="text-sm text-zinc-500 font-semibold">
        REPORTES INDIVIDUALES
      </p>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* NEUMATICOS */}
        <Card
          icon={<Truck />}
          title="Neumáticos por equipo"
          desc="Estado actual: profundidad, presión, kilometraje y semáforo de riesgo."
          onClick={() =>
            download("tires", "Rivecor_Neumaticos.xlsx")
          }
        />

        {/* HISTORIAL */}
        <Card
          icon={<Wrench />}
          title="Historial de mantenciones"
          desc="Registro completo de visitas, trabajos realizados y próximas fechas."
          onClick={() =>
            download("history", "Rivecor_Historial.xlsx")
          }
        />

        {/* COSTO */}
        <Card
          icon={<DollarSign />}
          title="Costo x kilómetro"
          desc="Trazabilidad económica: precio, mantención, costo/km y vida útil."
          onClick={() =>
            download("costs", "Rivecor_Costos.xlsx")
          }
        />

        {/* MECANICOS */}
        <Card
          icon={<User />}
          title="Ficha de mecánicos"
          desc="Resumen por mecánico: trabajos, rotaciones, inspecciones y rendimiento."
          onClick={() =>
            download("mechanics", "Rivecor_Mecanicos.xlsx")
          }
        />

      </div>

    </div>
  );
}

/* CARD ORIGINAL BONITA */
function Card({ icon, title, desc, onClick }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition">

      <div className="flex items-start gap-4">
        <div className="bg-zinc-800 p-3 rounded-xl text-white">
          {icon}
        </div>

        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-zinc-400">
            {desc}
          </p>
        </div>
      </div>

      <button
        onClick={onClick}
        className="mt-6 flex items-center justify-center gap-2 bg-green-500 py-3 rounded-xl hover:bg-green-400 transition"
      >
        <Download size={16} />
        Descargar Excel
      </button>
    </div>
  );
}