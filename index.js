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
            mongoClient.close();
            res.status(422).send(messages);
        }

        const userWithName = await db.collection("users").findOne({ name: name });
        if (userWithName) {
            mongoClient.close();
            res.sendStatus(409);
        }

        db.collection("users").insertOne(userToInsert);

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        });
        mongoClient.close();
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        mongoClient.close();
        res.sendStatus(500);
    }
});

app.get('/participants', async (req, res) => {
    await mongoClient.connect();
    const db = mongoClient.db("uol");
    try {
        const participantsColection = db.collection("users");
        const participantsList = await participantsColection.find().toArray();
        mongoClient.close();
        res.status(200).send(participantsList);
    } catch (error) {
        console.log(error);
        mongoClient.close();
        res.status(500).send(error);
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
            mongoClient.close();
            res.sendStatus(422);
        }

        await db.collection("messages").insertOne(message);
        mongoClient.close();
        res.status(201).send();
    } catch (error) {
        mongoClient.close();
        res.status(500).send(error);
    }
});

app.get('/messages', (req, res) => {

});

app.post('/status', async (req, res) => {

    await mongoClient.connect();
    const db = mongoClient.db("uol");

    const user = req.headers.user;

    try {
        const userFromDb = await db.collection("users").findOne({ name: user });
        userFromDb.lastStatus = Date.now();

        if (!userFromDb) {
            mongoClient.close();
            res.sendStatus(404);
        }

        await db.collection('users').updateOne({ name: user }, { $set: {lastStatus: Date.now()} });
        mongoClient.close();
        res.sendStatus(200);

    } catch (error) {
        console.log(error);
        mongoClient.close();
        res.sendStatus(500);
    }
});


app.listen(5000);
