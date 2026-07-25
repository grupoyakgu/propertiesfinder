-- CreateIndex
CREATE INDEX "catastro_parcels_latitude_longitude_idx" ON "catastro_parcels"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "plots_latitude_longitude_idx" ON "plots"("latitude", "longitude");
