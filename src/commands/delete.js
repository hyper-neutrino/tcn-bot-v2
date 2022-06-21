import db from "../db.js";
import { get_poll } from "../utils.js";

export default async function (message, args) {
    if (args.length == 0) throw new Error("Missing ID.");

    const id = args.shift();
    if (!(await get_poll(id))) throw new Error(`No poll with ID \`${id}\`.`);

    const cancel = id == "cancel" ? "never mind" : "cancel";

    await message.reply(
        `Type the poll ID again to confirm that you wish to delete this poll or \`${cancel}\` to cancel.`
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
        await db("polls").findOneAndDelete({ id });
        await messages.first().reply(`Deleted poll with ID \`${id}\`.`);
    }
}
