import { SUCCESS } from "../colors.js";
import { create_poll, parse_poll } from "../utils.js";

const types = ["proposal", "selection", "election"];

export default async function (message, args) {
    const type = args.shift();

    if (!types.includes(type)) {
        throw new Error(
            `\`${type}\` is not a valid poll type (allowed are ${types
                .map((type) => `\`${type}\``)
                .join(", ")})`
        );
    }

    const poll = await parse_poll(message.client, args, type);
    await create_poll(poll);

    await message.reply({
        embeds: [
            {
                title: `**Created ${type} poll**: ${poll.id}`,
                description: poll.question,
                color: SUCCESS,
            },
        ],
    });

    await message.client.log(
        `**${message.author.tag}** created a ${type} poll: \`${poll.id}\``
    );
}
