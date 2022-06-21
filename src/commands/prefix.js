import { ERROR, INFO, SUCCESS } from "../colors.js";
import { get_prefix, set_prefix } from "../utils.js";

export default async function (message, args) {
    if (args.length == 0) {
        const prefix = await get_prefix();

        await message.reply({
            embeds: [
                {
                    title: `**Prefix: \`${prefix}\`**`,
                    description: `My prefix is \`${prefix}\` (or you can ping me as the prefix). Use \`${prefix}help\` for a list of modules and some usage information.`,
                    color: INFO,
                },
            ],
        });
    } else if (args.length == 1) {
        await set_prefix(args[0]);

        await message.reply({
            embeds: [
                {
                    title: `**Prefix: Updated: \`${args[0]}\`**`,
                    description: `My prefix is now \`${args[0]}\` (or you can ping me).`,
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
                        "`prefix [prefix]`: expected zero or one argument",
                    color: ERROR,
                },
            ],
        });
    }
}
