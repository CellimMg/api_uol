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
    name: joi.string().required(),
    lastStatus: joi.number().required()
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
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
            return;
        }

        const userWithName = await db.collection("users").findOne({name: name});
        if(userWithName){
            res.sendStatus(409);
            return;
        }

        db.collection("users").insertOne(userToInsert);

		await  db.collection("messages").insertOne({
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
    try {
        const participantsColection = db.collection("participants");
        const participantsList = await participantsColection.find().toArray();

        res.status(200).send(participantsList);
    } catch (error) {
        res.status(500).send(error)
    }
});

app.post('/messages', (req, res) => {

});

app.get('/messages', (req, res) => {

});

app.post('/status', (req, res) => {

});



app.listen(5000);
