const axios = require("axios");
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Helper function to get OAuth token
const getOAuthToken = async () => {
  const consumerKey = process.env.CONSUMER_KEY;
  const consumerSecret = process.env.CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting OAuth token:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

// Function to make the STK Push request
const makeSTKPush = async (phone, amount) => {
  const token = await getOAuthToken();
  if (!token) return;

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, -3);
  const shortcode = process.env.SHORTCODE;
  const passkey = process.env.PASSKEY;
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64"
  );

  const stkPushData = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: 254722830229,
    PartyB: 174379, // The paybill/till number receiving the payment
    PhoneNumber: 254722830229, // Same as PartyA
    CallBackURL: process.env.CALLBACK_URL,
    AccountReference: "Winam Tech",
    TransactionDesc: "Payment for services",
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("STK Push response:", response.data);
  } catch (error) {
    console.error(
      "Error making STK push:",
      error.response ? error.response.data : error.message
    );
  }
};

// Sample route to trigger STK Push
app.post("/stkpush", (req, res) => {
  const { phone, amount } = req.body;
  makeSTKPush(phone, amount);
  res.status(200).send("STK Push initiated.");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
