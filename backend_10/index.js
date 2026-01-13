const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = 3000;

const app = express();
app.use(cors());
app.use(express.json())

const uri =
 `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.entyjty.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database = client.db("petService");
    const petServices = database.collection("services");
    const orderCollections = database.collection("orders");

    app.post("/services", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await petServices.insertOne(data);
      res.send(result);
    });

    //get services in DB
    app.get("/services", async (req, res) => {
      const { category } = req.query;  
      console.log(category);
      const query = {};
      if (category) {
        query.category = category;
      }

      const result = await petServices.find(query).toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const { id } = req.params; // Correct destructuring
      try {
        const query = { _id: new ObjectId(id) };
        const result = await petServices.findOne(query);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch service" });
      }
    });
    app.get("/my-services", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await petServices.find(query).toArray();
      res.send(result);
    });
    app.put("/update/:id", async (req, res) => {
      const data = req.body;
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const updateServices = {
        $set: data,
      };
      const result = await petServices.updateOne(query, updateServices);
      res.send(result);
    });
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await petServices.deleteOne(query);
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await orderCollections.insertOne(data);
      res.status(201).send(result);
    });
    app.get("/orders", async (req, res) => {
      const result = await orderCollections.find().toArray();
      res.status(200).send(result);
    });
    // Delete order by ID
    app.delete("/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await orderCollections.deleteOne(query);

        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Order deleted successfully" });
        } else {
          res.status(404).send({ message: "Order not found" });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to delete order" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);
app.get('/',(req,res)=>{
    res.send('Hello Dev')
})
app.listen(port,()=>{
    console.log(`server is runnuing on ${port}`);
    
})
