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
  // Add more mappings as needed
};

// Check if the WhatsApp number belongs to staff
function isStaffNumber(whatsAppNumber) {
  return staffNumbers.includes(whatsAppNumber);
}

// Assign department based on WhatsApp number
function assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber) {
  const department = departmentMapping[whatsAppNumber] || "general";
  console.log(`Assigned department for ${whatsAppNumber}: ${department}`);
  return department;
}

// Assign staff based on WhatsApp number
function assignStaffBasedOnWhatsAppNumber(whatsAppNumber) {
  const mapping = {
    "+2341234567890": "staff1",
    "+2340987654321": "staff2",
    "+2348062209847": "staff3",
  };
  const staffId = mapping[whatsAppNumber] || "staffDefault";
  console.log(`Assigned staffId for ${whatsAppNumber}: ${staffId}`);
  return staffId;
}

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
    console.log(`Sentiment analysis result: ${sentiment}`);
    return sentiment;
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return handleOpenAIError(error, "analyzeSentiment", text);
  }
}

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
    console.log(`OpenAI next step result: ${nextStep}`);
    return nextStep;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return handleOpenAIError(error, "callOpenAI", prompt);
  }
}

async function handleOpenAIError(error, functionName, inputText) {
  if (error.response && error.response.status === 429) {
    console.error(`${functionName}: Rate limit exceeded. Retrying after delay...`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return this[functionName](inputText);
  } else if (error.response && error.response.status === 402) {
    console.error(`${functionName}: Insufficient funds. Please check your billing details.`);
    return "Insufficient funds. Please check your billing details.";
  } else {
    console.error(`${functionName}: ${error.message}`);
    return error.message;
  }
}

app.post("/webhook/:whatsAppNumber", async (req, res) => {
  console.log(`Webhook endpoint hit. WhatsApp number: ${req.params.whatsAppNumber}`);
  const message = req.body;
  console.log(`Received message: ${JSON.stringify(message)}`);

  const whatsAppNumber = req.params.whatsAppNumber;
  const isStaff = isStaffNumber(whatsAppNumber);

  console.log(`WhatsApp number: ${whatsAppNumber}`);
  console.log(`Staff check: ${isStaff}`);

  const department = assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber);
  console.log(`Assigned department: ${department}`);

  const staffId = assignStaffBasedOnWhatsAppNumber(whatsAppNumber);
  console.log(`Assigned staffId: ${staffId}`);

  if (isStaff) {
    console.log(`Message from staff number: ${whatsAppNumber}`);
    console.log(`Staff message content: ${message.text}`);

    console.log("Entering try block for staff message processing...");
    // Save staff message to Firestore
    try {
      console.log("Calling analyzeSentiment for staff message...");
      const sentiment = await analyzeSentiment(message.text);
      console.log(`Sentiment analysis for staff completed: ${sentiment}`);

      console.log("Calling callOpenAI for staff message...");
      const nextStep = await callOpenAI(`Analyze the following staff message and provide next steps: ${message.text}`);
      console.log(`Next step for staff from OpenAI: ${nextStep}`);

      console.log("Saving staff message to Firestore...");
      const savedMessage = await db.collection("messages").add({
        ...message,
        sentiment: sentiment || "N/A",
        nextStep: nextStep || "N/A",
        whatsAppNumber: whatsAppNumber,
        department: department,
        staffId: staffId,
        timestamp: new Date().toISOString(),
      });
      console.log("Staff message saved to Firestore:", savedMessage.id);
    } catch (error) {
      console.error("Error saving staff message to Firestore:", error);
      res.status(500).send("Error saving staff message to Firestore.");
      return;
    }

    console.log("Exiting try block for staff message processing...");

    //this should display on server terminal
    res.send(`Acknowledged staff message: ${message.text}`);
  } else {
    console.log(`Message from client number: ${whatsAppNumber}`);

    try {
      const clientData = await fetchClientData(whatsAppNumber);

      if (clientData.messages.length === 0) {
        console.log("New client detected. Creating new record in Firestore...");
        try {
          const newClient = await db.collection("clients").add({
            whatsAppNumber: whatsAppNumber,
            firstMessage: message.text,
            timestamp: new Date().toISOString(),
          });
          console.log("New client record created:", newClient.id);
        } catch (error) {
          console.error("Error creating new client record:", error);
        }
      }

      const sentiment = await analyzeSentiment(message.text);
      console.log(`Sentiment analysis completed: ${sentiment}`);

      const detailedPrompt = createDetailedPrompt(clientData, message);
      console.log(`Detailed prompt: ${detailedPrompt}`);

      const nextStep = await callOpenAI(detailedPrompt);
      console.log(`Next step from OpenAI: ${nextStep}`);

      console.log("Saving message and analysis to Firestore...");
      try {
        const savedMessage = await db.collection("messages").add({
          ...message,
          sentiment: sentiment || "N/A",
          nextStep: nextStep || "N/A",
          whatsAppNumber: whatsAppNumber,
          department: department,
          staffId: staffId,
          timestamp: new Date().toISOString(),
        });
        console.log("Message and analysis saved to Firestore:", savedMessage.id);
      } catch (error) {
        console.error("Error saving message to Firestore:", error);
        res.status(500).send("Error saving message to Firestore.");
        return;
      }

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
  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
