import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatCatastroParcelDisplayAddress } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  IN_REVIEW: "In review",
  NOT_RELEVANT: "Not relevant",
  VALIDATED: "Validated",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!user.permissions.includes("export_xls")) {
    return new Response(JSON.stringify({ error: "XLS export is disabled for your account" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const favorites = await prisma.favorite.findMany({
    where: { source: "catastro" },
    orderBy: { createdAt: "desc" },
    include: { assignedUser: { select: { name: true } } },
  });
  const parcels = await prisma.catastroParcel.findMany({
    where: { id: { in: favorites.map((f) => f.propertyId) } },
  });
  const parcelById = new Map(parcels.map((p) => [p.id, p]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Opportunities");
  sheet.columns = [
    { header: "Referencia Catastral", key: "referencia", width: 24 },
    { header: "Address", key: "address", width: 30 },
    { header: "Municipality", key: "municipality", width: 20 },
    { header: "Province", key: "province", width: 20 },
    { header: "Plot Size (m2)", key: "plotSize", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Assigned To", key: "assignedTo", width: 20 },
    { header: "Added", key: "addedAt", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const favorite of favorites) {
    const parcel = parcelById.get(favorite.propertyId);
    if (!parcel) continue;
    sheet.addRow({
      referencia: parcel.referenciaCatastral,
      address: formatCatastroParcelDisplayAddress(parcel),
      municipality: parcel.municipality,
      province: parcel.province,
      plotSize: parcel.plotSize,
      status: STATUS_LABELS[favorite.status] ?? favorite.status,
      assignedTo: favorite.assignedUser.name,
      addedAt: favorite.createdAt.toISOString().slice(0, 10),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="opportunities.xlsx"',
    },
  });
}
