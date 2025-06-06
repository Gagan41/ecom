import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import axios from "axios";
import crypto from "crypto";
import uniqid from "uniqid";

// Global variables
const currency = "inr";
const deliveryCharge = 10;

// PhonePe configuration constants (override via environment variables if needed)
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT86";

// Endpoints for different operations
const PHONEPE_AUTH_HOST_URL =
  process.env.PHONEPE_AUTH_HOST_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
const PHONEPE_CHECKOUT_HOST_URL =
  process.env.PHONEPE_CHECKOUT_HOST_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
// For status, using the pre-production sandbox host
const PHONEPE_STATUS_HOST_URL =
  process.env.PHONEPE_STATUS_HOST_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox";

const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const SALT_KEY =
  process.env.PHONEPE_SALT_KEY || "96434309-7796-489d-8924-ab56988a6076";
const APP_BE_URL = process.env.PHONEPE_APP_BE_URL || "http://localhost:5173";

/**
 * Helper function to generate X-VERIFY header and base64 encoded payload.
 *
 * @param {object} payload - The JSON payload for the API call.
 * @param {string} apiPath - The API path to be concatenated.
 * @param {string} saltKey - The salt key provided by PhonePe.
 * @param {number|string} saltIndex - The salt index.
 * @returns {object} - Contains xVerify (checksum) and base64EncodedPayload.
 */
const generateXVerify = (payload, apiPath, saltKey, saltIndex) => {
  // Convert payload to JSON string and encode to Base64
  const base64EncodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  // Concatenate the base64 encoded payload, API path, and salt key
  const stringToHash = base64EncodedPayload + apiPath + saltKey;
  // Compute SHA-256 hash
  const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
  // Append "###" and the salt index to the hash
  const xVerify = `${sha256Hash}###${saltIndex}`;
  return { xVerify, base64EncodedPayload };
};

/**
 * Fetch Auth Token from PhonePe.
 * This token is used to authorize subsequent API calls.
 */
const getAuthToken = async () => {
  const url = PHONEPE_AUTH_HOST_URL;
  const data = new URLSearchParams({
    client_id: process.env.PHONEPE_CLIENT_ID,
    client_secret: process.env.PHONEPE_CLIENT_SECRET,
    client_version: "1",
    grant_type: "client_credentials",
  });

  try {
    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Auth Token Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to fetch PhonePe auth token");
  }
};


// Placing orders using COD Method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();
    await userModel.findByIdAndUpdate(userId, { cartData: {} });
    res.json({ success: true, message: "Order Placed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using PhonePe PG
const placeOrderPhonePG = async (req, res) => {
  try {
    const { userId, items, amount, address, mobileNumber } = req.body;
    // Generate a unique transaction id for this order/payment
    let merchantTransactionId = uniqid();

    // Create a new order with PhonePe as the payment method.
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "PhonePG",
      payment: false,
      merchantTransactionId, // store the transaction id for later verification
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // Prepare payload for PhonePe payment initiation.
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId,
      amount: amount * 100, // converting to paise
      redirectUrl: `${APP_BE_URL}/order-summary`,
      redirectMode: "REDIRECT",
      mobileNumber: mobileNumber || "9999999999", // fallback mobile number if not provided
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    // Generate X-VERIFY header using the payload and API path.
    const { xVerify, base64EncodedPayload } = generateXVerify(
      payload,
      "/pg/v1/pay",
      SALT_KEY,
      SALT_INDEX
    );

    // Fetch the auth token
    const token = await getAuthToken();

    // Initiate payment via PhonePe Checkout endpoint.
    const response = await axios.post(
      PHONEPE_CHECKOUT_HOST_URL,
      { request: base64EncodedPayload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          accept: "application/json",
          "Authorization": `O-Bearer ${token}`,
        },
      }
    );

    // Retrieve the redirect URL from PhonePe response.
    const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
    res.json({ success: true, redirectUrl });
  } catch (error) {
    console.log("Error in placeOrderPhonePG:", error.response ? error.response.data : error.message);
    res.json({ success: false, message: error.message });
  }
};

// Verify PhonePe PG Payment
const verifyPhonePG = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    const userId = req.query.userId || req.body.userId; // Ensure the frontend passes userId
    if (!merchantTransactionId) {
      return res.json({ success: false, message: "Invalid Transaction ID" });
    }
    // Build the status URL for PhonePe.
    const statusUrl = `${PHONEPE_STATUS_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;

    // Generate X-VERIFY header for status call (empty payload used).
    const { xVerify } = generateXVerify(
      {},
      `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
      SALT_KEY,
      SALT_INDEX
    );

    // Fetch the auth token
    const token = await getAuthToken();

    // Check payment status from PhonePe.
    const statusResponse = await axios.get(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": MERCHANT_ID,
        accept: "application/json",
        "Authorization": `O-Bearer ${token}`,
      },
    });

    // If payment is successful, update the order and clear the user's cart.
    if (statusResponse.data && statusResponse.data.code === "PAYMENT_SUCCESS") {
      await orderModel.findOneAndUpdate({ merchantTransactionId }, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      res.json({
        success: true,
        message: "Payment Successful",
        data: statusResponse.data,
      });
    } else {
      res.json({
        success: false,
        message: "Payment Failed or Pending",
        data: statusResponse.data,
      });
    }
  } catch (error) {
    console.log("Error verifying payment:", error.response ? error.response.data : error.message);
    res.json({ success: false, message: error.message });
  }
};

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// User Order Data for Frontend
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Update order status from Admin Panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  placeOrder,
  placeOrderPhonePG,
  verifyPhonePG,
  allOrders,
  userOrders,
  updateStatus,
  getAuthToken,
};
