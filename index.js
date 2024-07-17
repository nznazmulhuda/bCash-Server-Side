const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

// app and port set
const app = express();
const port = process.env.PORT || 5000;
// const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.pbmq8lu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb://localhost:27017/`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// middlware
app.use(
    cors({
        origin: ["http://localhost:4000"],
        credentials: true,
    }),
);
app.use(cookieParser());
app.use(express.json());

// This middleware will check if the user is logged in and has the correct account status
// If not, it will respond with an error message
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" });
        }
        req.user = decoded;
        next();
    });
};

// routes
async function run() {
    try {
        // All collection is here
        const UserDB = client.db("bCash").collection("users");
        const TransictionDB = client.db("bCash").collection("transiction");

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

        // Route: 2 / Login
        app.post("/login", async (req, res) => {
            const data = req.body;
            const user = await UserDB.findOne({
                $or: [{ email: data.numOrMail }, { number: data.numOrMail }],
            });

            if (user) {
                const match = await bcrypt.compare(data.pin, user.pin);
                // check the pin matches the user pic
                if (match && user.accountActive && !user.accountBlock) {
                    // Generate JWT token with 1 hour expiration
                    const token = jwt.sign(
                        { email: user.email },
                        process.env.SECRET_KEY,
                        { expiresIn: "1h" },
                    );

                    // Set the cookie with the token
                    res.cookie("token", token, cookieOptions).send(user);
                } else if (match && !user.accountActive && !user.accountBlock) {
                    res.status(404).send({
                        message: "Your account is not activated!",
                    });
                } else if (match && user.accountActive && user.accountBlock) {
                    res.status(404).send({
                        message: "Your account is blocked!",
                    });
                } else if (match && !user.accountActive && user.accountBlock) {
                    res.status(404).send({
                        message: "Your account is blocked!",
                    });
                } else {
                    res.status(404).send({ message: "Invalid user details!" });
                }
            } else {
                res.status(404).send({ message: "User not found!" });
            }
        });

        // Route: 3 / Pin validate
        app.post("/pinValidate", async (req, res) => {
            const data = req.body;
            const user = await UserDB.findOne({
                $or: [
                    { email: data.senderMail },
                    { number: data.senderNumber },
                ],
            });

            if (user) {
                const match = await bcrypt.compare(data.pin, user.pin);
                if (match) {
                    res.send({ success: true, message: "Pin Matched!" });
                } else {
                    res.send({ success: false, message: "Pin not matched!" });
                }
            } else {
                res.send({ message: "Invalid User!" });
            }
        });

        // Route: 4 / send money
        app.post("/sendMoney", async (req, res) => {
            const data = req.body;
            const user = await UserDB.findOne({
                $or: [
                    { email: data.recNumOrMail },
                    { number: data.recNumOrMail },
                ],
            });

            if (user) {
                const result = await TransictionDB.insertOne(data);
                return res.send(result);
            } else {
                res.status(404).send({ message: "Invalid user!" });
            }
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
