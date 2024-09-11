import fastify from "fastify";

const app = fastify();

app
	.listen({
		port: 8800,
	})
	.then(() => {
		console.log("HTTP server running");
	})
	.catch((err) => {
		console.log(err);
	});
