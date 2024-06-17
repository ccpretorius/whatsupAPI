import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import { createRequire } from "module"; // so you can use import syntax and not require and module
const require = createRequire(import.meta.url);

const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// Verify if the environment variable is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

// Initialize Firebase Admin with service account
let serviceAccount;
try {
  serviceAccount = require("./firebase-service-account.json");
} catch (error) {
  console.error("Error loading Firebase service account:", error);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
  process.exit(1);
}

const db = admin.firestore();

// Initialize the OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
  process.exit(1);
}

async function callOpenAI(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `Secure this message: ${prompt}` }],
      max_tokens: 150,
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("Invalid OpenAI response");
    }

    return response.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error("Rate limit exceeded. Retrying after delay...");
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 1 minute before retrying
      return callOpenAI(prompt); // Retry the request
    } else if (error.response && error.response.status === 402) {
      console.error("Insufficient funds. Please check your billing details.");
      throw new Error("Insufficient funds. Please check your billing details.");
    } else {
      throw error;
    }
  }
}

app.post("/webhook/:whatsAppNumber", async (req, res) => {
  const message = req.body;
  const whatsAppNumber = req.params.whatsAppNumber;
  const department = assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber);
  const staffId = assignStaffBasedOnWhatsAppNumber(whatsAppNumber);

  try {
    const securedMessage = await callOpenAI(message.text);

    await db.collection("messages").add({
      ...message,
      securedText: securedMessage,
      whatsAppNumber: whatsAppNumber,
      department: department,
      staffId: staffId,
      timestamp: new Date().toISOString(),
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing message:", error);

    if (error.response) {
      console.error("Error details:", error.response.data);
    } else {
      console.error("Unknown error:", error.message);
    }

    res.status(500).send("Internal Server Error");
  }
});

function assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber) {
  const mapping = {
    "+2341234567890": "sales",
    "+2340987654321": "support",
    // Add more mappings as needed
  };
  return mapping[whatsAppNumber] || "general";
}

function assignStaffBasedOnWhatsAppNumber(whatsAppNumber) {
  const mapping = {
    "+2341234567890": "staff1",
    "+2340987654321": "staff2",
    // Add more mappings as needed
  };
  return mapping[whatsAppNumber] || "staffDefault";
}

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

// This is a small change for testing commit
