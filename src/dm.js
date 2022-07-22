import { get_council, get_voters } from "./api.js";
import db from "./db.js";
import { get_vote_channel } from "./utils.js";

export default async function (client, poll) {
    const vote_channel = await get_vote_channel(client);
    if (!vote_channel) return;

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
                await client.log(`[FAIL] I could not DM ${user.tag}.`);
            }
        }
    }

    if (failed.length > 0) {
        await (
            await get_vote_channel(client)
        ).send({
            content: `${failed.join(
                " "
            )} Hello! Please remember to vote on the poll (you are eligible to vote on \`${
                poll.id
            }\` and have not yet voted). Remember to check <#929771954544709642> for information and recent discussions and events. (I could not DM you - make sure you have DMs from server members on for this server and have not blocked me.)`,
            allowedMentions: { parse: ["users"] },
        });
    }
}
