import { ERROR, INFO, SUCCESS } from "../colors.js";
import { get_setting, get_vote_channel, set_setting } from "../utils.js";

export default async function (message, args) {
    if (args.length == 0) {
        const channel = await get_vote_channel(message.client);

        await message.reply({
            embeds: [
                {
                    title: `**Vote Channel**`,
                    description:
                        `The vote channel is ${channel}. ` +
                        (channel
                            ? "Polls and elections will be posted here."
                            : "Use `vote-channel [channel]` to set the channel."),
                    color: channel ? INFO : ERROR,
                },
            ],
        });
    } else if (args.length == 1) {
        const channel = await message.client.parse_channel(args[0]);

        if (
            ![
                "GUILD_TEXT",
                "GUILD_NEWS",
                "GUILD_NEWS_THREAD",
                "GUILD_PUBLIC_THREAD",
                "GUILD_PRIVATE_THREAD",
            ].includes(channel.type)
        ) {
            throw new Error("The vote channel must be a text-like channel.");
        }

        await set_setting("vote-channel", channel.id);

        await message.reply({
            embeds: [
                {
                    title: `**Vote Channel Set**`,
                    description: `The vote channel is now ${channel}. Polls and elections will be posted here.`,
                    color: SUCCESS,
                },
            ],
        });
    } else {
        await message.reply({
            embeds: [
                {
                    title: `**Error**`,
                    description:
                        "`vote-channel [channel]`: expected zero to one argument",
                    color: ERROR,
                },
            ],
        });
    }
}
