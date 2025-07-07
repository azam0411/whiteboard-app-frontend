import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./Whiteboard.css";

const socket = io();

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const chatEndRef = useRef(null);

  const [color, setColor] = useState("#ffffff");
  const [width, setWidth] = useState(2);
  const [isEraser, setEraser] = useState(false);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const roomId = window.location.pathname.split("/").pop();

  // Join socket room
  useEffect(() => {
    if (!joined) return;

    socket.emit("join-room", { roomId, name });

    socket.on("draw", (data) => {
      const canvas = canvasRef.current;
      draw(
        data.lastX * canvas.width,
        data.lastY * canvas.height,
        data.x * canvas.width,
        data.y * canvas.height,
        data.color,
        data.width
      );
    });

    socket.on("clear", () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("update-users", (userList) => {
      setUsers(userList);
    });

    socket.on("chat-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });
  }, [joined]);

  // Canvas drawing logic
  useEffect(() => {
    if (!joined) return;

    const canvas = canvasRef.current;
    canvas.width = 1000;
    canvas.height = 600;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const ctx = canvas.getContext("2d");
    let drawing = false;

    const handleMouseDown = (e) => {
      const pos = getPos(e);
      lastX.current = pos.x;
      lastY.current = pos.y;
      drawing = true;
    };

    const handleMouseMove = (e) => {
      if (!drawing) return;
      const pos = getPos(e);

      draw(
        lastX.current,
        lastY.current,
        pos.x,
        pos.y,
        isEraser ? "#2c3e50" : color,
        width
      );

      socket.emit("draw", {
        lastX: lastX.current / canvas.width,
        lastY: lastY.current / canvas.height,
        x: pos.x / canvas.width,
        y: pos.y / canvas.height,
        color: isEraser ? "#2c3e50" : color,
        width: width,
      });

      lastX.current = pos.x;
      lastY.current = pos.y;
    };

    const handleMouseUp = () => {
      drawing = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseout", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseout", handleMouseUp);
    };
  }, [joined, color, width, isEraser]);

  const draw = (fromX, fromY, toX, toY, color, width) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear");
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit("chat-message", chatInput.trim());
      setChatInput("");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = () => {
    if (name.trim()) setJoined(true);
  };

  // Before joining screen
  if (!joined) {
    return (
      <div className="name-form-container">
        <div className="name-form">
          <h2>🎓 Enter Your Name to Join the Whiteboard</h2>
          <input
            type="text"
            placeholder="Your name (e.g., Azam)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleJoin}>Join Classroom</button>
        </div>
      </div>
    );
  }

  return (
    <div className="whiteboard-container">
      <div className="sidebar">
        <h3>👥 Class Participants</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index}>👤 {user}</li>
          ))}
        </ul>
      </div>

      <div className="main-content">
        <div className="whiteboard-header">
          📚 Virtual Classroom – Room <span className="room-id">{roomId}</span>
        </div>

        <div className="toolbar">
          <label>
            🎨 Color:
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>

          <label>
            📏 Width:
            <input
              type="range"
              min="1"
              max="20"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={isEraser}
              onChange={(e) => setEraser(e.target.checked)}
            />{" "}
            🧽 Eraser
          </label>

          <button onClick={handleClear}>🧹 Clear Board</button>
        </div>

        <canvas ref={canvasRef} className="whiteboard-canvas" />

        <div className="chatbox">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                <strong>{msg.name}:</strong> {msg.message}
              </div>
            ))}
            <div ref={chatEndRef}></div>
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
