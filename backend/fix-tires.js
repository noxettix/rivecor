const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getDefaultPositions(type) {
  const t = String(type || "").toUpperCase();

  if (t === "TRUCK") {
    return [
      "DELANTERO IZQ",
      "DELANTERO DER",
      "TRASERO IZQ 1",
      "TRASERO IZQ 2",
      "TRASERO DER 1",
      "TRASERO DER 2",
    ];
  }

  return ["DEL IZQ", "DEL DER", "TRA IZQ", "TRA DER"];
}

async function run() {
  try {
    console.log("Buscando equipos sin neumáticos...");

    const equipments = await prisma.equipments.findMany({
      include: { tires: true },
    });

    for (const eq of equipments) {
      if (eq.tires.length > 0) continue;

      console.log("Creando neumáticos para:", eq.code);

      const positions = getDefaultPositions(eq.type);

      await prisma.tires.createMany({
        data: positions.map((pos) => ({
          equipmentId: eq.id,
          position: pos,
          status: "OK",
          isActive: true,
        })),
      });
    }

    console.log("LISTO ✅");
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();