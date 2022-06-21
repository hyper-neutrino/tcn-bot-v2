import db from "../db.js";
import display from "../display.js";
import { get_poll, get_prefix, get_vote_channel } from "../utils.js";

export default async function (message, args) {
    const id = args.shift();
    if (!id) throw new Error("Missing ID.");

    let hours = args.shift();
    if (!hours) throw new Error("Missing duration (enter in hours).");

    hours = parseFloat(hours);
    if (isNaN(hours) || hours <= 0) {
        throw new Error("Duration must be a positive number.");
    }

    const poll = await get_poll(id);
    if (!poll) throw new Error(`No poll with ID \`${id}\`.`);

    poll.time = new Date();
    poll.time.setSeconds(poll.time.getSeconds() + hours * 3600);

    const channel = await get_vote_channel(message.client);
    if (!channel) {
        throw new Error(
            `Configure the vote channel with \`${await get_prefix()}vote-channel <channel>\` first.`
        );
    }

    const sent = await channel.send(await display(poll));

    const messages = [];

    if (message.channel.id != channel.id) {
        messages.push(`Posted poll \`${id}\`.`);
    }

    if (poll.posted) {
        messages.push(
            "This poll has been posted before. If multiple copies exist, unexpected behavior may occur. If the other copies have been deleted, you can disregard this message."
        );
    }

    if (messages.length > 0) await message.reply(messages.join(" "));

    await db("polls").findOneAndUpdate(
        { id },
        {
            $set: {
                time: poll.time,
                posted: true,
                channel: channel.id,
                message: sent.id,
            },
        }
    );
}
