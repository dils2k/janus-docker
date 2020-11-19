const express = require("express");

const app = express();

app.use("/static", express.static(__dirname + "/static"));
app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));
app.get("/viewer", (_, res) => res.sendFile(__dirname + "/viewer.html"));
app.get("/test", (_, res) => res.sendFile(__dirname + "/old_index.html"));

const port = 3000;
app.listen(port, () => console.log(`**** Server is up and running on ${port} ****`));
