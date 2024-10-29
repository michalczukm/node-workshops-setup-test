CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Customer" (name) VALUES ('John Doe');
INSERT INTO "Customer" (name) VALUES ('Jane Doe');
