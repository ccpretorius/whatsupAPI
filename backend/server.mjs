import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// Verify if the environment variable is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

console.log("Starting server...");

// Initialize Firebase Admin with service account
let serviceAccount;
try {
  serviceAccount = require("./firebase-service-account.json");
  console.log("Firebase service account loaded successfully.");
} catch (error) {
  console.error("Error loading Firebase service account:", error);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
  process.exit(1);
}

const db = admin.firestore();
console.log("Firestore initialized successfully.");

// Initialize the OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("OpenAI client initialized successfully.");
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
  process.exit(1);
}

// List of known staff numbers
const staffNumbers = [
  "+2341234567890", // Staff 1
  "+2340987654321", // Staff 2
  "+2348062209847", // Staff 3
];

// Mapping of WhatsApp numbers to departments
const departmentMapping = {
  "+2341234567890": "sales",
  "+2340987654321": "support",
  "+2348062209847": "management",
};

// Check if the WhatsApp number belongs to staff
function isStaffNumber(whatsAppNumber) {
  return staffNumbers.includes(whatsAppNumber);
}

// Fetch client data from Firestore
async function fetchClientData(senderNumber) {
  const clientData = {};
  console.log(`Fetching client data for sender number: ${senderNumber}`);

  try {
    const messagesSnapshot = await db.collection("messages").where("senderNumber", "==", senderNumber).get();
    if (!messagesSnapshot.empty) {
      clientData.messages = messagesSnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(`Fetched message: ${JSON.stringify(data).slice(0, 20)}`);
        return data;
      });
      console.log(`Fetched ${clientData.messages.length} messages for client.`);
    } else {
      console.log("No messages found for this client.");
    }
  } catch (error) {
    console.error("Error fetching client data:", error);
  }

  return clientData;
}

// Create a detailed prompt for OpenAI
function createDetailedPrompt(clientData, currentMessage) {
  console.log("Creating detailed prompt...");
  let prompt = `
  Analyze the following client data and provide the most pressing next step:

  Latest Message: ${currentMessage.text}

  Client's Message History:
  `;

  clientData.messages.forEach((msg, index) => {
    prompt += `
    Message ${index + 1}: ${msg.text}
    Sentiment: ${msg.sentiment || "N/A"}
    `;
  });

  prompt += `
  Provide the most important next step based on the analysis.
  `;

  console.log("Detailed prompt created.");
  return prompt;
}

// Function to analyze sentiment using OpenAI
async function analyzeSentiment(text) {
  console.log(`Analyzing sentiment for text: ${text}`);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `Analyze the sentiment of this message: ${text}` }],
      max_tokens: 50,
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("Invalid OpenAI response");
    }

    const sentiment = response.choices[0].message.content.trim();
    console.log(`Sentiment analysis result: ${sentiment.slice(0, 20)}`);
    return sentiment;
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    handleOpenAIError(error, "analyzeSentiment", text);
  }
}

// Function to call OpenAI for generating next steps
async function callOpenAI(prompt) {
  console.log(`Calling OpenAI with prompt: ${prompt}`);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("Invalid OpenAI response");
    }

    const nextStep = response.choices[0].message.content.trim();
    console.log(`OpenAI next step result: ${nextStep.slice(0, 20)}`);
    return nextStep;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    handleOpenAIError(error, "callOpenAI", prompt);
  }
}

// Handle OpenAI errors
async function handleOpenAIError(error, functionName, inputText) {
  if (error.response && error.response.status === 429) {
    console.error(`${functionName}: Rate limit exceeded. Retrying after delay...`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return this[functionName](inputText);
  } else if (error.response && error.response.status === 402) {
    console.error(`${functionName}: Insufficient funds. Please check your billing details.`);
    throw new Error("Insufficient funds. Please check your billing details.");
  } else {
    console.error(`${functionName}: ${error.message}`);
    throw error;
  }
}

// Webhook endpoint to process incoming messages
app.post("/webhook/:senderNumber", async (req, res) => {
  console.log(`Webhook endpoint hit. Sender number: ${req.params.senderNumber}`);
  const message = req.body;
  console.log(`Received message: ${JSON.stringify(message)}`);

  const senderNumber = req.params.senderNumber;
  console.log("Sender Number: ", senderNumber);

  const isStaff = isStaffNumber(senderNumber);
  console.log("Is Staff: ", isStaff);

  // Debug logging to check department mapping
  console.log(`WhatsApp number: ${senderNumber}`);
  console.log(`Staff check: ${isStaff}`);
  console.log(`Department mapping: ${JSON.stringify(departmentMapping)}`);

  const department = departmentMapping[senderNumber] || "general";
  console.log(`Assigned department: ${department}`);

  const staffId = assignStaffBasedOnWhatsAppNumber(senderNumber);
  console.log(`Assigned staffId: ${staffId}`);

  try {
    const sentiment = await analyzeSentiment(message.text);
    console.log(`Sentiment analysis completed: ${sentiment.slice(0, 20)}`);

    // Always fetch client data
    const clientData = await fetchClientData(senderNumber);
    console.log(`Client data fetched: ${JSON.stringify(clientData).slice(0, 20)}`);

    const detailedPrompt = createDetailedPrompt(clientData, message);
    console.log(`Detailed prompt: ${detailedPrompt}`);

    const nextStep = await callOpenAI(detailedPrompt);
    console.log(`Next step from OpenAI: ${nextStep.slice(0, 20)}`);

    console.log("Saving message and analysis to Firestore...");
    const savedMessage = await db.collection("messages").add({
      ...message,
      sentiment: sentiment || "N/A",
      nextStep: nextStep || "N/A",
      senderNumber: senderNumber,
      recipientNumber: "client_number_here", // Placeholder
      department: department,
      staffId: staffId,
      timestamp: new Date().toISOString(),
    });
    console.log("Message and analysis saved to Firestore:", savedMessage.id);
    res.send(`Acknowledged message: ${message.text}`);
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Function to assign staff based on WhatsApp number
function assignStaffBasedOnWhatsAppNumber(whatsAppNumber) {
  const mapping = {
    "+2348062209847": "staff1",
    "+2340987654321": "staff2",
  };
  return mapping[whatsAppNumber] || "staffDefault";
}

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
