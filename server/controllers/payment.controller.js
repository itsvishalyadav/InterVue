import crypto from "crypto";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import razorpay from "../services/razorpay.service.js";

export const createOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay is not configured." });
    }

    const { planId, amount, credits } = req.body;
    const numericAmount = Number(amount);
    const numericCredits = Number(credits);

    if (
      !planId ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isFinite(numericCredits) ||
      numericCredits <= 0
    ) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    const options = {
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      userId: req.userId,
      planId,
      amount: numericAmount,
      credits: numericCredits,
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to create Razorpay order: ${error.message}`,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "Razorpay is not configured." });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );

      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "paid") {
      const user = await User.findById(payment.userId);
      return res.status(200).json({
        success: true,
        message: "Already processed",
        user,
      });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    const updatedUser = await User.findByIdAndUpdate(
      payment.userId,
      { $inc: { credits: payment.credits } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and credits added",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to verify Razorpay payment: ${error.message}`,
    });
  }
};
