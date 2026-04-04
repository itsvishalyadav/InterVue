import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  generateQuestion,
  submitAnswer,
  finishInterview,
} from "../controllers/interview.controller.js";

const interviewRouter = express.Router();

interviewRouter.post("/generate-questions", isAuth, generateQuestion);
interviewRouter.post("/submit-answer", isAuth, submitAnswer);
interviewRouter.post("/finish", isAuth, finishInterview);

export default interviewRouter;
