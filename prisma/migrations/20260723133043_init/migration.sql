-- CreateEnum
CREATE TYPE "CadastralClass" AS ENUM ('URBANO', 'RUSTICO');

-- CreateEnum
CREATE TYPE "PlotShape" AS ENUM ('REGULAR', 'IRREGULAR', 'RECTANGULAR', 'TRIANGULAR', 'L_SHAPED', 'CORNER');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('URBAN', 'DEVELOPABLE', 'RURAL', 'PROTECTED', 'HISTORIC');

-- CreateEnum
CREATE TYPE "DevelopmentPotential" AS ENUM ('RESIDENTIAL', 'HOTEL', 'APARTHOTEL', 'COMMERCIAL', 'MIXED_USE', 'OFFICE', 'STUDENT_HOUSING', 'SENIOR_LIVING', 'LOGISTICS');

-- CreateEnum
CREATE TYPE "Topography" AS ENUM ('FLAT', 'SLOPED');

-- CreateEnum
CREATE TYPE "LandUse" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'TOURISM', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('DETACHED_HOUSE', 'TERRACED_HOUSE', 'APARTMENT_BLOCK', 'VILLA', 'WAREHOUSE', 'OFFICE_BUILDING', 'HOTEL_BUILDING', 'COMMERCIAL_BUILDING', 'VACANT_PLOT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "autonomousCommunity" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "referenciaCatastral" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "plotSize" DOUBLE PRECISION NOT NULL,
    "builtArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "superficieGrafica" DOUBLE PRECISION,
    "constructionYear" INTEGER,
    "landUse" "LandUse" NOT NULL,
    "cadastralUse" "CadastralClass" NOT NULL,
    "buildingType" "BuildingType" NOT NULL,
    "numberOfFloors" INTEGER NOT NULL DEFAULT 0,
    "maxBuildableArea" DOUBLE PRECISION NOT NULL,
    "buildabilityRatio" DOUBLE PRECISION NOT NULL,
    "occupancyRatio" DOUBLE PRECISION NOT NULL,
    "plotShape" "PlotShape" NOT NULL,
    "cornerPlot" BOOLEAN NOT NULL DEFAULT false,
    "frontageWidth" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "valorCatastral" DOUBLE PRECISION NOT NULL,
    "planningStatus" "PlanningStatus" NOT NULL,
    "developmentPotential" "DevelopmentPotential"[],
    "allowedUses" TEXT[],
    "maxHeight" DOUBLE PRECISION,
    "restrictions" TEXT[],
    "zoning" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "pricePerSqm" DOUBLE PRECISION NOT NULL,
    "estimatedConstructionCost" DOUBLE PRECISION,
    "expectedROI" DOUBLE PRECISION,
    "expectedYield" DOUBLE PRECISION,
    "developmentMargin" DOUBLE PRECISION,
    "topography" "Topography" NOT NULL,
    "doubleFrontage" BOOLEAN NOT NULL DEFAULT false,
    "existingBuilding" BOOLEAN NOT NULL DEFAULT false,
    "demolitionRequired" BOOLEAN NOT NULL DEFAULT false,
    "vacantLand" BOOLEAN NOT NULL DEFAULT false,
    "boundary" JSONB,
    "nearbyAmenities" TEXT[],
    "aiScore" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "aiAnalyzedAt" TIMESTAMP(3),

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plots_slug_key" ON "plots"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plots_referenciaCatastral_key" ON "plots"("referenciaCatastral");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_plotId_key" ON "favorites"("userId", "plotId");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
