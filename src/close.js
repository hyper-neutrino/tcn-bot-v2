import db from "./db.js";
import display from "./display.js";

export default async function (message, poll) {
    await db("polls").findOneAndUpdate(
        { id: poll.id },
        { $set: { closed: true } }
    );

    poll.closed = true;
    if (message) await message.edit(await display(poll));
}
