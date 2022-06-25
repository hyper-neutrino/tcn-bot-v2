import { get_council, get_voters } from "./api.js";
import client from "./client.js";
import close from "./close.js";
import config from "./config.js";
import db from "./db.js";
import { get_vote_channel } from "./utils.js";

process.on("uncaughtException", (error) => {
    console.error(error?.stack ?? error);
});

client.on("ready", async () => {
    setInterval(async () => {
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
                const vote_channel = await get_vote_channel(client);
                if (!vote_channel) continue;

                const time = new Date();
                time.setSeconds(time.getSeconds() + poll.dm * 3600);

                if (time > poll.time) {
                    await db("polls").findOneAndUpdate(
                        { id: poll.id },
                        { $set: { dm: undefined } }
                    );

                    const failed = [];

                    for (const user_id of poll.restrict
                        ? await get_voters()
                        : await get_council()) {
                        if (poll.votes[user_id] === undefined) {
                            let user;

                            try {
                                user = await client.users.fetch(user_id);
                            } catch {
                                await client.log(
                                    `[FAIL] I was not able to fetch the user with ID \`${user_id}\`.`
                                );
                            }

                            try {
                                await user.send(
                                    `Hello! Please remember to vote on the poll in ${vote_channel} (you are eligible to vote on \`${poll.id}\` and have not yet voted). Remember to check <#929771954544709642> for information and recent discussions and events.`
                                );

                                await client.log(`[AUTO] DM'd ${user.tag}.`);
                            } catch {
                                failed.push(user);
                                await client.log(
                                    `[FAIL] I could not DM ${user.tag}.`
                                );
                            }
                        }
                    }

                    if (failed.length > 0) {
                        await vote_channel.send({
                            content: `${failed.join(
                                " "
                            )} Hello! Please remember to vote on the poll (you are eligible to vote on \`${
                                poll.id
                            }\` and have not yet voted). Remember to check <#929771954544709642> for information and recent discussions and events. (I could not DM you - make sure you have DMs from server members on for this server and have not blocked me.)`,
                            allowedMentions: { parse: ["users"] },
                        });
                    }
                }
            }
        }
    }, 10000);

    console.log("TCN bot is ready.");
});

client.run(config.discord_token);
