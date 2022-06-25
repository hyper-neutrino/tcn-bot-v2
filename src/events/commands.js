import { recursive, require, res } from "file-ez";
import { Event } from "paimon.js";
import shlex from "shlex";
import { is_observer } from "../api.js";
import { ERROR } from "../colors.js";
import config from "../config.js";
import { get_prefix } from "../utils.js";

const commands = {};

for (const path of await recursive(res("../commands"))) {
    const key = path
        .split("/")
        .pop()
        .split("\\")
        .pop()
        .split(".")
        .slice(0, -1)
        .join(".");

    commands[key] = await require(path);
}

export default new Event({
    event: "messageCreate",

    async run(message) {
        if (message.author.id == message.client.user.id) return;
        if (message.guild?.id != config.guild_id) return;

        let content;

        for (const prefix of [
            await get_prefix(),
            `<@${message.client.user.id}>`,
        ]) {
            if (message.content.startsWith(prefix)) {
                content = message.content.substring(prefix.length).trim();
                break;
            }
        }

        if (!content) return;

        const key = content.split(" ")[0];
        let args, error;

        try {
            args = shlex.split(content.substring(key.length).trim());
        } catch (e) {
            error = e;
        }

        if (key in commands) {
            if (error) {
                await message.reply({
                    embeds: [
                        {
                            title: "**Error**",
                            description: `Error parsing arguments: \`${error.message}\``,
                            color: ERROR,
                        },
                    ],
                });
            } else {
                if (!(await is_observer(message.author.id))) {
                    return await message.reply(
                        "You do not have permission to run commands!"
                    );
                }

                try {
                    await commands[key](message, args);
                } catch (e) {
                    await message.reply({
                        embeds: [
                            {
                                title: "**Error**",
                                description: e.message,
                                color: ERROR,
                            },
                        ],
                    });
                }
            }
        }
    },
});
