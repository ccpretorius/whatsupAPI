import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// Verify server is running
app.get("/", (req, res) => {
  console.log("Received request at /");
  res.send("Server is running");
});

// Ensure webhook endpoint is hit
app.post("/webhook/:whatsAppNumber", (req, res) => {
  console.log(`Webhook endpoint hit. WhatsApp number: ${req.params.whatsAppNumber}`);
  const message = req.body;
  console.log(`Received message: ${JSON.stringify(message)}`);
  res.send("Message received");
});

app.listen(3000, () => {
  console.log("Minimal server started on port 3000");
});
