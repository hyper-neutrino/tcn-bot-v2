import { res } from "file-ez";
import { Client, load_all } from "paimon.js";

Client.prototype.parse_user = async function (string) {
    const match = string.match(/\d+|<@!?\d+>/);

    if (match) {
        try {
            return await this.users.fetch(match[0]);
        } catch {
            throw new Error(`No user with ID \`${match[0]}\` could be found.`);
        }
    } else {
        throw new Error(`\`${string}\` is not a valid user ID or mention.`);
    }
};

Client.prototype.parse_role = async function (string) {
    const match = string.match(/\d+|<@&\d+>/);

    if (match) {
        try {
            return await this.roles.fetch(match[0]);
        } catch {
            throw new Error(
                `No role with ID \`${match[0]}\` could be found in this server.`
            );
        }
    } else {
        throw new Error(`\`${string}\` is not a valid role ID or mention.`);
    }
};

Client.prototype.parse_channel = async function (string) {
    const match = string.match(/\d+|<@#\d+>/);

    if (match) {
        try {
            return await this.channels.fetch(match[0]);
        } catch {
            throw new Error(
                `No channel with ID \`${match[0]}\` could be found in this server.`
            );
        }
    } else {
        throw new Error(`\`${string}\` is not a valid channel ID or mention.`);
    }
};

Client.prototype.log = async function (message) {
    try {
        return await (
            await this.channels.fetch("957305086902698034")
        ).send(message);
    } catch {}
};

export default new Client({
    intents: 131071,
    partials: ["CHANNEL", "MESSAGE", "REACTION"],
    allowedMentions: { parse: [] },
    commands: [],
    events: await load_all(res("./events")),
});
