-- CreateTable
CREATE TABLE "records" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);
