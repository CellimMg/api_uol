import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';

dotenv.config();

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
    type: joi.string().required(),
    time: joi.string().required()
});

app.post('/participants', (req, res) => {

});

app.get('/participants', (req, res) => {

});

app.post('/messages', (req, res) => {

});

app.get('/messages', (req, res) => {

});

app.post('/status', (req, res) => {

});



app.listen(5000);
