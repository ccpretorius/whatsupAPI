import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const Messages = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "messages"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesArray = [];
      querySnapshot.forEach((doc) => {
        messagesArray.push({ ...doc.data(), id: doc.id });
      });
      setMessages(messagesArray);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Messages</h1>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <p>
              <strong>{message.whatsAppNumber}</strong>: {message.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Messages;

// Test message from a third terminal
// curl -X POST http://localhost:3000/webhook/+2348062209847 \
//      -H "Content-Type: application/json" \
//      -d '{"text": "Hello, this is a test message no 1"}'

// curl -X POST http://localhost:3000/webhook/+2348062209847 \
//      -H "Content-Type: application/json" \
//      -d '{"text": "Hello, this is a test message no 1"}'
