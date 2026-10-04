import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import path from "node:path";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.resolve(__dirname, "../public");

// Resolve libcurl transport directory safely via entry point
const libcurlMain = fileURLToPath(import.meta.resolve("@mercuryworkshop/libcurl-transport"));
const libcurlPath = path.dirname(libcurlMain);

// Wisp Configuration
logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		const server = createServer();

		server.on("request", (req, res) => {
			res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
			res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
			handler(req, res);
		});

		server.on("upgrade", (req, socket, head) => {
			if (req.url && req.url.startsWith("/wisp")) {
				wisp.routeRequest(req, socket, head);
			} else {
				socket.destroy();
			}
		});

		return server;
	},
});

fastify.get("/check-tls-domain", async (req, reply) => {
	return reply.code(200).send({ status: "ok" });
});

// Register static handlers
await fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

await fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

await fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

await fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((req, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	if (typeof address === "object" && address !== null) {
		console.log("Listening on:");
		console.log(`\thttp://localhost:${address.port}`);
		console.log(`\thttp://${hostname()}:${address.port}`);
		console.log(
			`\thttp://${
				address.family === "IPv6" ? `[${address.address}]` : address.address
			}:${address.port}`
		);
	}
});

const shutdown = async () => {
	console.log("Shutdown signal received: closing HTTP server");
	await fastify.close();
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const port = parseInt(process.env.PORT || "8080", 10);

try {
	await fastify.listen({
		port: isNaN(port) ? 8080 : port,
		host: "0.0.0.0",
	});
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}