import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./firebase"; // Adjust the import path based on your file structure

const Messages = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "messages"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      messagesData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort messages by timestamp
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="text-sm py-2 px-4 border-b border-gray-300">Source</th>
              <th className="text-sm py-2 px-4 border-b border-gray-300">Chat</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id} className="hover:bg-gray-100">
                <td className="text-xs py-2 px-4 border-b border-gray-300 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    <span className="whitespace-nowrap">{new Date(message.timestamp).toLocaleString()}</span>
                    <span>{message.senderNumber}</span>
                    <span>{message.recipientNumber}</span>
                  </div>
                </td>
                <td className="text-sm font-bold py-2 px-4 border-b border-gray-300 bg-gray-50">
                  <div className="p-2">
                    <p className="text-gray-700">{message.text}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Messages;
