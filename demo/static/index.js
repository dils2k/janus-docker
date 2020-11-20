const player = document.querySelector("video#player");
const startStreamingButton = document.querySelector("button#startStreaming");

const roomDisplay = document.querySelector("#room");
const feedDisplay = document.querySelector("#feed");

const janusURL = "http://139.59.129.170:8088/janus"

const CONFIG = {
  audio: false,
  video: true,
  iceServers: [
    {url:'stun:stun01.sipphone.com'},
    {url:'stun:stun.ekiga.net'},
    {url:'stun:stun.fwdnet.net'},
    {url:'stun:stun.ideasip.com'},
    {url:'stun:stun.iptel.org'},
    {url:'stun:stun.rixtelecom.se'},
    {url:'stun:stun.schlund.de'},
    {url:'stun:stun.l.google.com:19302'},
    {url:'stun:stun1.l.google.com:19302'},
    {url:'stun:stun2.l.google.com:19302'},
    {url:'stun:stun3.l.google.com:19302'},
    {url:'stun:stun4.l.google.com:19302'},
    {url:'stun:stunserver.org'},
    {url:'stun:stun.softjoys.com'},
    {url:'stun:stun.voiparound.com'},
    {url:'stun:stun.voipbuster.com'},
    {url:'stun:stun.voipstunt.com'},
    {url:'stun:stun.voxgratia.org'},
    {url:'stun:stun.xten.com'},
    {
      url: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    },
    {
      url: 'turn:192.158.29.39:3478?transport=udp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    },
    {
      url: 'turn:192.158.29.39:3478?transport=tcp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    }]
}

let sessionID;
let handleID;
let roomID;
let feedID;

let socket = new WebSocket("ws://localhost:3001/janus", "janus-protocol");
socket.onopen = () => {
  console.log("Socket successfully connected!");
}

const createSessionTransaction = "createSession";
const attachPluginTransaction = "attachPlugin";
const makeRoomTransaction = "makeRoom";
const joinPublisherTransaction = "joinPublisher";
const publishTransaction = "publish";
const joinSubscriberTransaction = "joinSubscriber";

let peerConnection;

startStreamingButton.addEventListener("click", () => {
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
      makeRoom();
      break;
    case makeRoomTransaction:
      roomID = msg.plugindata.data.room;
      joinRoom();
      break;
    case joinPublisherTransaction:
      feedID = msg.plugindata.data.id;
      startBroadcast();
      break;
    case publishTransaction:
      publish(msg.jsep);
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

function makeRoom() {
  msg = JSON.stringify({
    janus: 'message',
    transaction: makeRoomTransaction,
    body: { request: 'create' },
    session_id: sessionID,
    handle_id: handleID
  });

  socket.send(msg);
}

function joinRoom() {
  msg = JSON.stringify({
    janus: 'message',
    transaction: joinPublisherTransaction,
    body: {
      request: 'join',
      ptype: 'publisher',
      room: roomID
    },
    session_id: sessionID,
    handle_id: handleID
  });

  socket.send(msg);
}

async function startBroadcast(payload) {
  console.log("**** Starting a broadcast ****");
  peerConnection = new RTCPeerConnection(CONFIG);
  peerConnection.onicecandidate = onicecandidate;
  peerConnection.ontrack = ontrack;

  const mediaConf = { audio: false, video: true }

  const stream = await navigator.mediaDevices.getUserMedia(mediaConf);
  player.srcObject = stream;
  peerConnection.addStream(stream);

  const offer = await peerConnection.createOffer()
  peerConnection.setLocalDescription(offer);

  msg = JSON.stringify({
    janus: 'message',
    transaction: publishTransaction,
    body: { request: 'publish' },
    jsep: offer,
    session_id: sessionID,
    handle_id: handleID
  });

  socket.send(msg);

  roomDisplay.innerHTML = roomID;
  feedDisplay.innerHTML = feedID;

  console.log("------------------------------------")
  console.log(` - Room ID:    ${roomID}`);
  console.log(` - Feed ID:    ${feedID}`);
  console.log(` - Handle ID:  ${handleID}`);
  console.log(` - Session ID: ${roomID}`);
  console.log("------------------------------------")
}

function publish(jsep) {
  peerConnection.setRemoteDescription(new RTCSessionDescription(jsep));
}

function onicecandidate(evt) {
  console.log("*** I got ice on me ***");
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

function ontrack() {
  msg = JSON.stringify({ janus: 'keepalive', transaction: 'keepalive', session_id: sessionID });
  socket.send(msg);
}

