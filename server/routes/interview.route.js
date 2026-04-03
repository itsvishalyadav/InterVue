import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { generateQuestion } from "../controllers/interview.controller.js";

const interviewRouter = express.Router();

interviewRouter.post("/generate-questions", isAuth, generateQuestion);

export default interviewRouter;
