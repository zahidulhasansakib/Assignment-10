

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.entyjty.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("petService");
    const servicesCollection = database.collection("services");
    const ordersCollection = database.collection("orders");

    // ====== SERVICES ======
    app.post("/services", async (req, res) => {
      const data = req.body;
      const serviceWithStatus = {
        ...data,
        status: "available",
        createdAt: new Date(),
      };
      const result = await servicesCollection.insertOne(serviceWithStatus);
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const { category } = req.query;
      const query = {};
      if (category) query.category = category;
      const result = await servicesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const service = await servicesCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(service);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch service" });
      }
    });

    // Update car status when booked
    app.patch("/services/:id/status", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: status } }
        );

        res.status(200).send({ message: "Status updated", result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update status" });
      }
    });

    // ====== ORDERS 
    app.post("/orders", async (req, res) => {
      const orderData = req.body;

      if (!orderData.carId || !orderData.renterEmail) {
        return res.status(400).send({
          message: "carId and renterEmail are required",
        });
      }

      try {
        // Check if car exists
        const car = await servicesCollection.findOne({
          _id: new ObjectId(orderData.carId),
        });

        if (!car) {
          return res.status(404).send({ message: "Car not found" });
        }

        if (car.status === "unavailable") {
          return res
            .status(400)
            .send({ message: "This car is already booked" });
        }

        // Check if already booked by anyone
        const existingOrder = await ordersCollection.findOne({
          carId: orderData.carId,
          status: "confirmed",
        });

        if (existingOrder) {
          return res
            .status(400)
            .send({ message: "Car already booked by another user" });
        }

        // Create order
        const orderWithMeta = {
          ...orderData,
          status: "confirmed",
          orderDate: new Date(),
        };

        const orderResult = await ordersCollection.insertOne(orderWithMeta);

        // Update car status to unavailable
        await servicesCollection.updateOne(
          { _id: new ObjectId(orderData.carId) },
          { $set: { status: "unavailable" } }
        );

        res.status(201).send({
          ...orderResult,
          message: "Booking successful",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to create booking" });
      }
    });

    // Get ALL booked cars (for Home & Service pages)
    app.get("/booked-cars", async (req, res) => {
      try {
        const activeOrders = await ordersCollection
          .find({
            status: "confirmed",
          })
          .toArray();

        const bookedCarIds = activeOrders
          .map((order) => order.carId)
          .filter((id) => id);

        res.status(200).send(bookedCarIds);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch booked cars" });
      }
    });

    // Get orders for SPECIFIC USER (My Orders page)
    app.get("/orders/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const userOrders = await ordersCollection
          .find({
            renterEmail: email,
            status: "confirmed",
          })
          .toArray();

        res.status(200).send(userOrders);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch user orders" });
      }
    });

    // Get ALL orders (admin)
    app.get("/orders", async (req, res) => {
      try {
        const orders = await ordersCollection.find().toArray();
        res.status(200).send(orders);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    // Cancel order
    app.delete("/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Find order first
        const order = await ordersCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!order) {
          return res.status(404).send({ message: "Order not found" });
        }

        // Delete order
        await ordersCollection.deleteOne({ _id: new ObjectId(id) });

        // Update car status back to available
        await servicesCollection.updateOne(
          { _id: new ObjectId(order.carId) },
          { $set: { status: "available" } }
        );

        res.status(200).send({ message: "Order cancelled successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to cancel order" });
      }
    });

    console.log("MongoDB connected successfully!");
  } finally {
    // client.close() if needed
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car Rental Backend is running!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


