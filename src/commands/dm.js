import dm from "../dm.js";
import { get_poll } from "../utils.js";

export default async function (message, args) {
    if (args.length == 0) throw new Error("Missing ID.");

    const id = args.shift();
    const poll = await get_poll(id);
    if (!poll) throw new Error(`No poll with ID \`${id}\`.`);

    const cancel = id == "cancel" ? "never mind" : "cancel";

    await message.reply(
        `Type the poll ID again to confirm that you wish to DM all eligible voters who have not voted on this poll yet, or \`${cancel}\` to cancel.`
    );

    const messages = await message.channel.awaitMessages({
        filter: (m) =>
            m.author.id == message.author.id &&
            (m.content == id || m.content == cancel),
        max: 1,
    });

    if (messages.size == 0) return;

    if (messages.first().content == cancel) {
        await messages.first().reply("Okay, cancelled.");
    } else {
        await dm(message.client, poll);
        await messages.first().reply(`DM'd for poll with ID \`${id}\`.`);
        await message.client.log(
            `**${message.author.tag}** manually triggered DMs for the poll with ID \`${id}\`.`
        );
    }
}
