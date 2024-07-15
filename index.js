const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { MongoClient, ServerApiVersion } = require("mongodb");

// app and port set
const app = express();
const port = process.env.PORT || 5000;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.pbmq8lu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// middlware
app.use(cors());
app.use(express.json());

// routes
async function run() {
    try {
        // All collection is here
        const UserDB = client.db("bCash").collection("users");

        // Route: 1 / Register
        app.post("/register", async (req, res) => {
            const data = req.body;
            const hashedPassword = await bcrypt.hash(data.pin, 10);
            data.pin = hashedPassword;
            data.accountActive = false;
            data.totalMoney = 0;
            data.accountBlock = false;
            data.transactionHistory = [];
            const result = await UserDB.insertOne(data);
            res.send(result);
        });

        // TESTING
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!",
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// test routes
app.get("/", (req, res) => {
    res.send("Server is listening on port " + port);
});

// listen on port
app.listen(port, () => console.log(`Server running on port ${port}`));
