import db from "./db.js";

export async function get_setting(key, backup = undefined) {
    return (await db("settings").findOne({ key }))?.value ?? backup;
}

export async function set_setting(key, value) {
    await db("settings").findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true }
    );
}

export async function get_prefix() {
    return await get_setting("prefix", "$");
}

export async function set_prefix(prefix) {
    await set_setting("prefix", prefix);
}

export async function get_vote_channel(client) {
    try {
        return await client.channels.fetch(
            (await get_setting("vote-channel")) ?? "0"
        );
    } catch {
        return undefined;
    }
}

export function validate_id(string) {
    if (string === undefined) {
        throw new Error("Missing poll ID.");
    }

    if (string.length == 0 || string.length > 16) {
        throw new Error("Poll IDs must be between 0 and 16 characters long.");
    }

    if (string.indexOf(".") != -1) {
        throw new Error("Poll IDs cannot contain `.`.");
    }
}

export async function parse_poll(client, args, type) {
    const id = args.shift();
    validate_id(id);

    if (await get_poll(id)) {
        throw new Error("This ID is already in use.");
    }

    let question = args.shift();
    if (!question) {
        throw new Error(
            type == "election" ? "Missing election wave." : "Missing question."
        );
    }

    if (type == "election") {
        question = parseInt(question);
        if (isNaN(question) || question <= 0) {
            throw new Error("Election wave must be a positive integer.");
        }
    }

    const poll = { choices: [] };

    let option;

    while ((option = args.length > 0)) {
        switch (args.shift()) {
            case "--quorum":
            case "-q":
                if (poll.quorum !== undefined) {
                    throw new Error("Quorum was defined twice.");
                }

                if (args.length == 0) {
                    throw new Error(
                        "Quorum flag was included but quorum was not specified."
                    );
                }

                poll.quorum = parseInt(args.shift());

                if (isNaN(poll.quorum)) {
                    throw new Error("Quorum argument must be an integer.");
                }

                if (poll.quorum < 0 || poll.quorum > 100) {
                    throw new Error("Quorum must be between 0 and 100.");
                }

                break;
            case "--anonymous":
            case "--anon":
            case "-a":
                if (poll.anon === false) {
                    throw new Error("Contradicting flags for anonymity.");
                }

                poll.anon = true;
                break;
            case "--identified":
            case "-i":
                if (poll.anon === true) {
                    throw new Error("Contradicting flags for anonymity.");
                }

                poll.anon = false;
                break;
            case "--live":
            case "-l":
                if (poll.live === false) {
                    throw new Error("Contradicting flags for live updating.");
                }

                poll.live = true;
                break;
            case "--hidden":
            case "--hide":
            case "-h":
                if (poll.live === true) {
                    throw new Error("Contradicting flags for live updating.");
                }

                poll.live = false;
                break;
            case "--restrict":
            case "--voter-only":
            case "-r":
            case "-v":
                if (poll.restrict === false) {
                    throw new Error(
                        "Contradicting flags for voter restsriction."
                    );
                }

                poll.restrict = true;
                break;
            case "--open":
            case "-o":
                if (poll.restrict === true) {
                    throw new Error(
                        "Contradicting flags for voter restriction."
                    );
                }

                poll.restrict = false;
                break;
            case "--preset":
            case "-p":
                if (args.length == 0) {
                    throw new Error(
                        "Preset flag was specified but no preset was given."
                    );
                }

                const name = args.shift();

                const preset = await db("presets").findOne({
                    name,
                });

                if (!preset) throw new Error(`No preset named \`${name}\``);

                for (const key in preset) {
                    poll[key] ??= preset[key];
                }

                break;
            case "--option":
            case "--choice":
            case "--candidate":
            case "-c":
                if (type == "proposal") {
                    throw new Error(
                        "Proposal polls don't accept choice arguments."
                    );
                } else if (type == "selection" && option == "--candidates") {
                    throw new Error(
                        "Incorrect flag `--candidate` for selection poll."
                    );
                }

                if (args.length == 0) {
                    throw new Error(
                        `\`${option}\` flag was specified but no option was given.`
                    );
                }

                let choice = args.shift();

                if (type == "election") {
                    choice = (await client.parse_user(choice)).id;
                }

                poll.choices.push(choice);

                break;
            default:
                throw new Error(`Unknown option \`${option}\`.`);
        }
    }

    poll.quorum ??= 0;

    if (poll.anon === undefined) throw new Error("Missing anonymity argument.");
    if (poll.live === undefined) {
        throw new Error("Missing live update argument.");
    }
    if (poll.restrict === undefined) {
        throw new Error("Missing voter restriction argument.");
    }

    return { id, type, question, ...poll, votes: {} };
}

export async function get_poll(id) {
    return await db("polls").findOne({ id });
}

export async function create_poll(options) {
    await db("polls").insertOne(options);
}

export async function set_vote(poll_id, user_id, vote) {
    await db("polls").findOneAndUpdate(
        { id: poll_id },
        { $set: { [`votes.${user_id}`]: vote } }
    );
}

export const alphabet_emojis = [
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "🇬",
    "🇭",
    "🇮",
    "🇯",
    "🇰",
    "🇱",
    "🇲",
    "🇳",
    "🇴",
    "🇵",
    "🇶",
    "🇷",
    "🇸",
    "🇹",
];
