import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

const hasRazorpayCredentials = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

const razorpay = hasRazorpayCredentials
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

export default razorpay;
