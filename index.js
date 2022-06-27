import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';
dotenv.config();
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

setInterval(cleanData, 15000);

async function cleanData() {
    await mongoClient.connect();
    const db = mongoClient.db("uol");
    try {
        const users = await db.collection("users").find({ lastStatus: { $lte: Date.now() - 10000 } }).toArray();
        const ids = users.map(user => user._id);
        await db.collection("users").deleteMany({ _id: { $in: [...ids] } });
        mongoClient.close();
    } catch (error) {
        console.log(error);
        mongoClient.close();
    }
}

const userSchema = joi.object({
    name: joi.string().min(1).required(),
    lastStatus: joi.number().required()
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid('message', 'private_message').required(),
    time: joi.string().required()
});

app.post('/participants', async (req, res) => {
    await mongoClient.connect();
    const db = mongoClient.db("uol");
    try {
        const { name } = req.body;
        const userToInsert = {
            name: name,
            lastStatus: Date.now()
        };
        const validation = userSchema.validate(userToInsert, { abortEarly: true });

        if (validation.error) {
            console.log(validation.error.details);
            const messages = validation.error.details.map(item => item.message);
            res.status(422).send(messages);
            mongoClient.close();
            return;
        }

        const userWithName = await db.collection("users").findOne({ name: name });
        if (userWithName) {
            res.sendStatus(409);
            mongoClient.close();
            return;
        }

        db.collection("users").insertOne(userToInsert);

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        });
        res.sendStatus(201);
        mongoClient.close();

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get('/participants', async (req, res) => {
    await mongoClient.connect();
    const db = mongoClient.db("uol");
    try {
        const participantsList = await db.collection("users").find().toArray();
        res.status(200).send(participantsList);
        mongoClient.close();
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
        mongoClient.close();
    }
});

app.post('/messages', async (req, res) => {
    await mongoClient.connect();
    const db = mongoClient.db("uol");

    const { to, text, type } = req.body;
    const user = req.headers.user;

    const message = {
        to: to,
        text: text,
        type: type,
        from: user,
        time: dayjs().format('HH:mm:ss')
    };

    try {

        const userFromDb = await db.collection("users").findOne({ name: user });
        const validation = messageSchema.validate(message, { abortEarly: false });

        if (validation.error || !userFromDb) {
            console.log(validation.error);
            res.sendStatus(422);
            mongoClient.close();
            return;
        }

        await db.collection("messages").insertOne(message);
        res.status(201).send();
        mongoClient.close();
    } catch (error) {
        res.status(500).send(error);
        mongoClient.close();
    }
});

app.get('/messages', async (req, res) => {
    const limit = req.query.limit;
    const user = req.headers.user;
    await mongoClient.connect();
    const db = mongoClient.db("uol");
    try {
        const messages = await db.collection("messages").find({ $or: [{ to: user }, { from: user }, { to: "Todos" },] }).toArray();
        if (limit) {
            res.status(200).send([...messages].reverse().slice(0, limit));
        } else {
            res.status(200).send([...messages].reverse());
        }
        mongoClient.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.post('/status', async (req, res) => {

    await mongoClient.connect();
    const db = mongoClient.db("uol");

    const user = req.headers.user;

    try {
        const userFromDb = await db.collection("users").findOne({ name: user });
        userFromDb.lastStatus = Date.now();

        if (!userFromDb) {
            res.sendStatus(404);
            mongoClient.close();
            return;
        }

        await db.collection('users').updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
        res.sendStatus(200);
        mongoClient.close();
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});


app.listen(5000);
