const http = require("http")
const express = require('express')
const app = express()
const fs = require("fs");
const ws = require('ws');
let users = {}

app.use(express.static('www'))

const server = http.createServer(app);
const wss = new ws.Server({ server });

const logPath = process.env.VALHEIM_SERVER_LOG_PATH;
const refreshInterval = process.env.VALHEIM_SERVER_REFRESH_INTERVAL;
const serverName = process.env.VALHEIM_SERVER_NAME;
const serverPort = process.env.VALHEIM_SERVER_PORT;

wss.on('connection', socket => {
  socket.on('message', message => console.log(message));
  sendUsers();
});

function sendUsers() {
	fs.readFile(logPath, "utf8", (err, data) => {
		if (err) {
			console.log(err)
			process.exit(1)
		} else {
			let lines = data.split("\n");

			let lastUser;
			for (let line of lines) {
				let handshake = line.match(/(handshake from client )(\d+)/);
				let user = line.match(/(Got character ZDOID from )([\w ]+)(\s:)/);
				let disconnected = line.match(/(Closing socket )(\d\d+)/)
				if (handshake) {
					let id = handshake[2];
					let time = new Date(line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/));
					users[id] = {connected: time, disconnected: undefined, user: undefined};
					lastUser = id;
				}
				if (disconnected) {
					let id = disconnected[2];
					if (!users[id]) continue;
					let user = users[id];
					let time = new Date(line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/));
					user.disconnected = time;
				}
				if (user) {
					if (lastUser) {
						users[lastUser].user = user[2];
						for (let u in users) { // Clean up users showing up multiple times in the list
							if (users[u].user == user[2] && u !== lastUser) delete users[u];
						}
						lastUser = undefined;
					}
				}
			}
			wss.clients.forEach((client) => {
				let msg = {};
				msg.users = users;
				msg.serverName = serverName;
				client.send(JSON.stringify(msg));
			});
		}
	});
}

setInterval(sendUsers, refreshInterval);

server.listen(serverPort, () => {
  console.log(`Valheim status at http://localhost:${serverPort}`)
})
