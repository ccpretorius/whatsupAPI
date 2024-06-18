// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import bodyParser from "body-parser";
// import admin from "firebase-admin";
// import { createRequire } from "module"; // so you can use import syntax and not require and module
// const require = createRequire(import.meta.url);

// const OpenAI = require("openai");

// const app = express();
// app.use(bodyParser.json());

// // Verify if the environment variable is loaded
// if (!process.env.OPENAI_API_KEY) {
//   console.error("Error: OPENAI_API_KEY is not set.");
//   process.exit(1);
// }

// // Initialize Firebase Admin with service account
// let serviceAccount;
// try {
//   serviceAccount = require("./firebase-service-account.json");
// } catch (error) {
//   console.error("Error loading Firebase service account:", error);
//   process.exit(1);
// }

// try {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// } catch (error) {
//   console.error("Error initializing Firebase Admin:", error);
//   process.exit(1);
// }

// const db = admin.firestore();

// // Initialize the OpenAI client
// let openai;
// try {
//   openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });
// } catch (error) {
//   console.error("Error initializing OpenAI client:", error);
//   process.exit(1);
// }

// async function callOpenAI(prompt) {
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [{ role: "user", content: `Secure this message: ${prompt}` }],
//       max_tokens: 150,
//     });

//     if (!response || !response.choices || response.choices.length === 0) {
//       throw new Error("Invalid OpenAI response");
//     }

//     return response.choices[0].message.content;
//   } catch (error) {
//     if (error.response && error.response.status === 429) {
//       console.error("Rate limit exceeded. Retrying after delay...");
//       await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 1 minute before retrying
//       return callOpenAI(prompt); // Retry the request
//     } else if (error.response && error.response.status === 402) {
//       console.error("Insufficient funds. Please check your billing details.");
//       throw new Error("Insufficient funds. Please check your billing details.");
//     } else {
//       throw error;
//     }
//   }
// }

// app.post("/webhook/:whatsAppNumber", async (req, res) => {
//   const message = req.body;
//   const whatsAppNumber = req.params.whatsAppNumber;
//   const department = assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber);
//   const staffId = assignStaffBasedOnWhatsAppNumber(whatsAppNumber);

//   try {
//     const securedMessage = await callOpenAI(message.text);

//     await db.collection("messages").add({
//       ...message,
//       securedText: securedMessage,
//       whatsAppNumber: whatsAppNumber,
//       department: department,
//       staffId: staffId,
//       timestamp: new Date().toISOString(),
//     });

//     res.sendStatus(200);
//   } catch (error) {
//     console.error("Error processing message:", error);

//     if (error.response) {
//       console.error("Error details:", error.response.data);
//     } else {
//       console.error("Unknown error:", error.message);
//     }

//     res.status(500).send("Internal Server Error");
//   }
// });

// function assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber) {
//   const mapping = {
//     "+2341234567890": "sales",
//     "+2340987654321": "support",
//     // Add more mappings as needed
//   };
//   return mapping[whatsAppNumber] || "general";
// }

// function assignStaffBasedOnWhatsAppNumber(whatsAppNumber) {
//   const mapping = {
//     "+2341234567890": "staff1",
//     "+2340987654321": "staff2",
//     // Add more mappings as needed
//   };
//   return mapping[whatsAppNumber] || "staffDefault";
// }

// app.listen(3000, () => {
//   console.log("Server started on port 3000");
// });

// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import bodyParser from "body-parser";
// import admin from "firebase-admin";
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);

// const OpenAI = require("openai");

// const app = express();
// app.use(bodyParser.json());

// // Verify if the environment variable is loaded
// if (!process.env.OPENAI_API_KEY) {
//   console.error("Error: OPENAI_API_KEY is not set.");
//   process.exit(1);
// }

// // Log at the beginning to confirm the server file is running
// console.log("Starting server...");

// // Initialize Firebase Admin with service account
// let serviceAccount;
// try {
//   serviceAccount = require("./firebase-service-account.json");
//   console.log("Firebase service account loaded successfully.");
// } catch (error) {
//   console.error("Error loading Firebase service account:", error);
//   process.exit(1);
// }

// try {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
//   console.log("Firebase Admin initialized successfully.");
// } catch (error) {
//   console.error("Error initializing Firebase Admin:", error);
//   process.exit(1);
// }

// const db = admin.firestore();
// console.log("Firestore initialized successfully.");

// // Initialize the OpenAI client
// let openai;
// try {
//   openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });
//   console.log("OpenAI client initialized successfully.");
// } catch (error) {
//   console.error("Error initializing OpenAI client:", error);
//   process.exit(1);
// }

// // Fetch client data from Firestore
// async function fetchClientData(whatsAppNumber) {
//   const clientData = {};
//   console.log(`Fetching client data for WhatsApp number: ${whatsAppNumber}`);

//   try {
//     const messagesSnapshot = await db.collection("messages").where("whatsAppNumber", "==", whatsAppNumber).get();
//     clientData.messages = messagesSnapshot.docs.map((doc) => doc.data());
//     console.log(`Fetched ${clientData.messages.length} messages for client.`);
//   } catch (error) {
//     console.error("Error fetching client data:", error);
//   }

//   return clientData;
// }

// // Create a detailed prompt for OpenAI
// function createDetailedPrompt(clientData, currentMessage) {
//   console.log("Creating detailed prompt...");
//   let prompt = `
//   Analyze the following client data and provide detailed next steps:

//   Latest Message: ${currentMessage.text}

//   Client's Message History:
//   `;

//   clientData.messages.forEach((msg, index) => {
//     prompt += `
//     Message ${index + 1}: ${msg.text}
//     Sentiment: ${msg.sentiment || "N/A"}
//     Categories: ${msg.categories || "N/A"}
//     `;
//   });

//   prompt += `
//   Based on the above data, provide structured next steps as follows:
//   1. Reselling Opportunity: Indicate if there is a need to resell to the client and provide suggestions.
//   2. Involving Staff: Specify if a specific staff member or department should be involved, and why.
//   3. Flagging for Attention: Specify if the message should be flagged for specific reasons and who should be notified.
//   4. General Recommendations: Provide any other recommendations or next steps based on the analysis.
//   `;

//   console.log("Detailed prompt created.");
//   return prompt;
// }

// // Function to analyze sentiment using OpenAI
// async function analyzeSentiment(text) {
//   console.log(`Analyzing sentiment for text: ${text}`);
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [{ role: "user", content: `Analyze the sentiment of this message: ${text}` }],
//       max_tokens: 50,
//     });

//     if (!response || !response.choices || response.choices.length === 0) {
//       throw new Error("Invalid OpenAI response");
//     }

//     const sentiment = response.choices[0].message.content.trim();
//     console.log(`Sentiment analysis result: ${sentiment}`);
//     return sentiment;
//   } catch (error) {
//     console.error("Error analyzing sentiment:", error);
//     handleOpenAIError(error, "analyzeSentiment", text);
//   }
// }

// async function callOpenAI(prompt) {
//   console.log(`Calling OpenAI with prompt: ${prompt}`);
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 300,
//     });

//     if (!response || !response.choices || response.choices.length === 0) {
//       throw new Error("Invalid OpenAI response");
//     }

//     const nextSteps = response.choices[0].message.content.trim();
//     console.log(`OpenAI next steps result: ${nextSteps}`);
//     return nextSteps;
//   } catch (error) {
//     console.error("Error calling OpenAI:", error);
//     handleOpenAIError(error, "callOpenAI", prompt);
//   }
// }

// async function handleOpenAIError(error, functionName, inputText) {
//   if (error.response && error.response.status === 429) {
//     console.error(`${functionName}: Rate limit exceeded. Retrying after delay...`);
//     await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait for 1 minute before retrying
//     return this[functionName](inputText); // Retry the request
//   } else if (error.response && error.response.status === 402) {
//     console.error(`${functionName}: Insufficient funds. Please check your billing details.`);
//     throw new Error("Insufficient funds. Please check your billing details.");
//   } else {
//     console.error(`${functionName}: ${error.message}`);
//     throw error;
//   }
// }

// app.post("/webhook/:whatsAppNumber", async (req, res) => {
//   console.log(`Webhook endpoint hit. WhatsApp number: ${req.params.whatsAppNumber}`);
//   const message = req.body;
//   console.log(`Received message: ${JSON.stringify(message)}`);

//   const whatsAppNumber = req.params.whatsAppNumber;
//   const department = assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber);
//   const staffId = assignStaffBasedOnWhatsAppNumber(whatsAppNumber);

//   try {
//     const sentiment = await analyzeSentiment(message.text);
//     console.log(`Sentiment analysis completed: ${sentiment}`);

//     const clientData = await fetchClientData(whatsAppNumber);
//     console.log(`Client data fetched: ${JSON.stringify(clientData)}`);

//     const detailedPrompt = createDetailedPrompt(clientData, message);
//     console.log(`Detailed prompt: ${detailedPrompt}`);

//     const nextSteps = await callOpenAI(detailedPrompt);
//     console.log(`Next steps from OpenAI: ${nextSteps}`);

//     console.log("Saving message and analysis to Firestore...");
//     await db.collection("messages").add({
//       ...message,
//       sentiment: sentiment,
//       nextSteps: nextSteps,
//       whatsAppNumber: whatsAppNumber,
//       department: department,
//       staffId: staffId,
//       timestamp: new Date().toISOString(),
//     });

//     console.log("Message and analysis saved to Firestore.");
//     res.sendStatus(200);
//   } catch (error) {
//     console.error("Error processing message:", error);

//     if (error.response) {
//       console.error("Error details:", error.response.data);
//     } else {
//       console.error("Unknown error:", error.message);
//     }

//     res.status(500).send("Internal Server Error");
//   }
// });

// function assignDepartmentBasedOnWhatsAppNumber(whatsAppNumber) {
//   const mapping = {
//     "+2341234567890": "sales",
//     "+2340987654321": "support",
//     // Add more mappings as needed
//   };
//   return mapping[whatsAppNumber] || "general";
// }

// function assignStaffBasedOnWhatsAppNumber(whatsAppNumber) {
//   const mapping = {
//     "+2341234567890": "staff1",
//     "+2340987654321": "staff2",
//     // Add more mappings as needed
//   };
//   return mapping[whatsAppNumber] || "staffDefault";
// }

// app.listen(3000, () => {
//   console.log("Server started on port 3000");
// });

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

// Fetch client data from Firestore
async function fetchClientData(whatsAppNumber) {
  const clientData = {};
  console.log(`Fetching client data for WhatsApp number: ${whatsAppNumber}`);

  try {
    const messagesSnapshot = await db.collection("messages").where("whatsAppNumber", "==", whatsAppNumber).get();
    clientData.messages = messagesSnapshot.docs.map((doc) => doc.data());
    console.log(`Fetched ${clientData.messages.length} messages for client.`);
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
    console.log(`Sentiment analysis result: ${sentiment}`);
    return sentiment;
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    handleOpenAIError(error, "analyzeSentiment", text);
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
    handleOpenAIError(error, "callOpenAI", prompt);
  }
}

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

app.post("/webhook/:whatsAppNumber", async (req, res) => {
  console.log(`Webhook endpoint hit. WhatsApp number: ${req.params.whatsAppNumber}`);
  const message = req.body;
  console.log(`Received message: ${JSON.stringify(message)}`);

  const whatsAppNumber = req.params.whatsAppNumber;
  const isStaff = isStaffNumber(whatsAppNumber);

  // Debug logging to check department mapping
  console.log(`WhatsApp number: ${whatsAppNumber}`);
  console.log(`Staff check: ${isStaff}`);
  console.log(`Department mapping: ${JSON.stringify(departmentMapping)}`);

  const department = departmentMapping[whatsAppNumber] || "general";
  console.log(`Assigned department: ${department}`);

  const staffId = assignStaffBasedOnWhatsAppNumber(whatsAppNumber);
  console.log(`Assigned staffId: ${staffId}`);

  if (isStaff) {
    console.log(`Message from staff number: ${whatsAppNumber}`);
    // Handle staff message logic here
    console.log(`Staff message content: ${message.text}`);
    res.send(`Acknowledged staff message: ${message.text}`);
  } else {
    console.log(`Message from client number: ${whatsAppNumber}`);

    try {
      // Check if client already exists in Firestore
      const clientData = await fetchClientData(whatsAppNumber);

      if (clientData.messages.length === 0) {
        console.log("New client detected. Creating new record in Firestore...");
        // Create new client record in Firestore
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
          sentiment: sentiment,
          nextStep: nextStep,
          whatsAppNumber: whatsAppNumber,
          department: department,
          staffId: staffId,
          timestamp: new Date().toISOString(),
        });
        console.log("Message and analysis saved to Firestore:", savedMessage.id);
      } catch (error) {
        console.error("Error saving message to Firestore:", error);
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
