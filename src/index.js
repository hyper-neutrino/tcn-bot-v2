import client from "./client.js";
import close from "./close.js";
import config from "./config.js";
import db from "./db.js";
import dm from "./dm.js";

process.on("uncaughtException", (error) => {
    console.error(error?.stack ?? error);
});

async function loop(client) {
    for (const poll of await db("polls").find({}).toArray()) {
        if (poll.time && !poll.closed && poll.time <= new Date()) {
            let message;

            try {
                const channel = await client.channels.fetch(poll.channel);
                message = await channel.messages.fetch(poll.message);
            } catch (e) {
                console.error(e?.stack ?? e);
            }

            await client.log(
                `[AUTO] Closing the poll with ID \`${poll.id}\`.`
            );
            await close(message, poll);
        } else if (poll.dm) {
            const time = new Date();
            time.setSeconds(time.getSeconds() + poll.dm * 3600);

            if (time > poll.time) await dm(client, poll);
        }
    }
    
    setTimeout(() => loop(client), 10000);
}

client.on("ready", async () => {
    loop(client);
    console.log("TCN bot is ready.");
});

client.run(config.discord_token);
