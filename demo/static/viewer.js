const player = document.querySelector("video#player");
const feedInput = document.querySelector("input#feed");
const roomInput = document.querySelector("input#room");
const startStreamingButton = document.querySelector("button#startStreaming");

const janusURL = "http://localhost:8088/janus"

const CONFIG = {
  audio: false,
  video: true,
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
  ]
}

let sessionID;
let handleID;

let socket = new WebSocket("ws://localhost:3001/janus", "janus-protocol");
socket.onopen = () => {
  console.log("Socket successfully connected!");
}

const createSessionTransaction = "createSession";
const attachPluginTransaction = "attachPlugin";
const joinSubscriberTransaction = "joinSubscriber";
const joinRoomTransaction = "joinRoom";

let peerConnection;

startStreamingButton.addEventListener("click", evt => {
  createSession();
});

socket.onmessage = evt => {
  const msg = JSON.parse(evt.data);
  console.log(`[janus-event] ${msg.transaction} - ${msg.janus}`);
  console.log(msg);

  if (msg.janus == "ack") {
    return;
  }

  switch (msg.transaction) {
    case createSessionTransaction:
      sessionID = msg.data.id;
      attachPlugin();
      break;
    case attachPluginTransaction:
      handleID = msg.data.id;
      joinRoomAsSubscriber();
      break;
    case joinSubscriberTransaction:
      // joinRoomAsViewer(msg.payload);
      console.log("**** jsep! ****");
      console.log(msg)
      joinBroadcast(msg.jsep);
      break;
     case joinRoomTransaction:
       break;
  }
};

function createSession() {
  socket.send(JSON.stringify({
    janus: "create",
    transaction: createSessionTransaction
  }));

  setInterval(() => {
    socket.send(JSON.stringify({
      janus: "keepalive",
      transaction: "keepalive",
      session_id: sessionID
    }));
  }, 30000); // 30 sec
}

function attachPlugin() {
  socket.send(JSON.stringify({
    janus: 'attach',
    transaction: attachPluginTransaction,
    plugin: "janus.plugin.videoroom",
    session_id: sessionID
  }));
}

//  function joinRoomAsSubscriber() {
//    msg = JSON.stringify({
//      janus: 'message',
//      transaction: joinRoomAsSubscriber,
//      body: {
//        request: 'join',
//        ptype: 'subscriber',
//        room: roomID
//      },
//      session_id: sessionID,
//      handle_id: handleID
//    });

//    console.log("**** joining room ****");
//    console.log(msg);

//    socket.send(msg);
//  }

function joinRoomAsSubscriber() {
  roomId = parseInt(roomInput.value);
  feedId = parseInt(feedInput.value);

  console.log("-------------------------------");
  console.log(` - Room ID:    ${roomId}`);
  console.log(` - Feed ID:    ${feedId}`);
  console.log(` - Session ID: ${sessionID}`);
  console.log(` - Handle ID:  ${handleID}`);
  console.log("-------------------------------");

  peerConnection = new RTCPeerConnection(CONFIG);
  peerConnection.onicecandidate = onicecandidate;
  peerConnection.ontrack = evt => {
    player.srcObject = evt.streams[0];
    player.play();
  };

  const body = {
    janus: 'message',
    transaction: joinSubscriberTransaction,
    body: {
      request : "join",
      ptype : "subscriber",
      room: roomId,
      feed: feedId
    },
    session_id: sessionID,
    handle_id: handleID
  };

  console.log(body);

  const msg = JSON.stringify(body);
  socket.send(msg);
}

function joinBroadcast(jsep) {
  peerConnection.setRemoteDescription(new RTCSessionDescription(jsep));
  peerConnection.createAnswer().then(function (answer) {
    peerConnection.setLocalDescription(answer);
    msg = JSON.stringify({ janus: 'message', transaction: 'blah', body: { request: 'start' }, jsep: answer, session_id: sessionID, handle_id: handleID });
    socket.send(msg);
  });
}

//    function joinRoomAsViewer(roomID) {
//      roomId = parseInt(roomInput.value);
//      msg = JSON.stringify({
//        janus: 'message',
//        transaction: joinPublisherTransaction,
//        body: {
//          request: 'join',
//          ptype: 'publisher',
//          room: roomID
//        },
//        session_id: sessionID,
//        handle_id: handleID
//      });
//
//      socket.send(msg);
//    }

function onicecandidate(evt) {
  console.log("*** some ice on me ***");
  console.log(evt);

  if (evt.candidate) {
    msg = {
      janus: "trickle",
      transaction: "candidate",
      candidate: evt.candidate,
      session_id: sessionID,
      handle_id: handleID
    }

    msg = JSON.stringify(msg);
    socket.send(msg);
  }
}

