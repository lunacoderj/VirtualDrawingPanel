const socket = new WebSocket("ws://localhost:8765");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.gesture === "DRAW") {
    drawPoint(data.x, data.y);
  }

  if (data.gesture === "ERASE") {
    erase();
  }

  if (data.gesture === "PAN") {
    moveCanvas(data.x, data.y);
  }
};
