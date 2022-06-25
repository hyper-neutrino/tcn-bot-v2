import { Event } from "paimon.js";
import {
    get_council,
    get_voters,
    is_council,
    is_observer,
    is_voter,
} from "../api.js";
import close from "../close.js";
import display from "../display.js";
import { get_poll, set_vote } from "../utils.js";

export default new Event({
    event: "interactionCreate",

    async run(interaction) {
        const args = interaction.customId.split(".");
        if (args[0] != "poll") return;

        const id = args[1];
        const poll = await get_poll(id);

        const update = ["yes", "no", "select", "trigger", "abstain"].includes(
            args[2]
        );

        if (update) {
            if (
                !(poll.restrict
                    ? await is_voter(interaction.user.id)
                    : await is_council(interaction.user.id))
            ) {
                await interaction.reply({
                    content: "You are not eligible to vote.",
                    ephemeral: true,
                });
            }
        }

        const response = await process(interaction, poll, args);
        if (response) {
            await interaction.reply({
                content: response,
                ephemeral: true,
            });
        }

        if (update) {
            await interaction.message.edit(
                await display(await get_poll(args[1]))
            );
        }
    },
});

async function process(interaction, poll, args) {
    const id = args[1];

    if (!poll) {
        await interaction.message.edit({
            components: [
                {
                    type: "ACTION_ROW",
                    components: [
                        {
                            type: "BUTTON",
                            style: "SECONDARY",
                            customId: "void",
                            label: "THIS POLL HAS BEEN DELETED",
                            disabled: true,
                        },
                    ],
                },
            ],
        });

        return "This poll appears to have been deleted from the database.";
    }

    if (new Date() > poll.time) {
        await close(interaction.message, poll);

        return "Sorry, this poll is supposed to be closed already. Either this is not the most recent copy or the scheduler was just about to run.";
    }

    const uid = interaction.user.id;

    if (args[2] == "yes") {
        await set_vote(id, uid, "yes");
        return "You have voted __in favor__ of the proposition.";
    } else if (args[2] == "no") {
        await set_vote(id, uid, "no");
        return "You have voted __in opposition__ to the proposition.";
    } else if (args[2] == "select") {
        if (interaction.values.length != 1) {
            return "More than one option was selected. This should not be possible; please contact HyperNeutrino about this.";
        }

        const value = interaction.values[0];

        await set_vote(id, uid, value);
        return `Your vote has been set to __${value}__.`;
    } else if (args[2] == "trigger") {
        if (poll.choices.includes(uid)) {
            return "You may not vote in an election you are running in.";
        }

        const ranks = new Map();
        const ballot = (poll.votes || {})[uid];
        if (ballot && ballot != -1) {
            ballot.forEach((key, index) => ranks.set(key, index + 1));
        }

        const fmap = new Map();
        const rmap = new Map();

        for (const oid of poll.choices) {
            const tag = (await interaction.client.users.fetch(oid)).tag;
            fmap.set(oid, tag);
            rmap.set(tag, oid);
        }

        const customId = `poll.${id}.${uid}.rank`;

        await interaction.showModal({
            customId,
            title: `Wave ${poll.question} Election`,
            components: [
                {
                    type: "ACTION_ROW",
                    components: [
                        {
                            type: "TEXT_INPUT",
                            style: "PARAGRAPH",
                            customId: "ranks",
                            label: `1 = BEST, ${poll.choices.length} = WORST`,
                            value: poll.choices
                                .map(
                                    (id) =>
                                        `${fmap.get(id)}: ${
                                            ranks.get(id) || ""
                                        }`
                                )
                                .join("\n"),
                        },
                    ],
                },
            ],
        });

        const modal = await interaction.awaitModalSubmit({
            filter: (modal) => modal.customId == customId,
            time: 0,
        });

        const response = modal.components[0].components[0].value;

        const taken = new Set();
        const values = [];

        try {
            for (const line of response.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const [key, value] = trimmed.split(":");

                if (!rmap.has(key)) {
                    throw `Error: ${key} is not one of the candidates.`;
                } else if (!value) {
                    throw `Error: you did not rank ${key}.`;
                }

                const rank = parseInt(value) - 1;

                if (isNaN(rank)) {
                    throw `Error: I do not understand what ${value} is supposed to mean as a ranking; I was expecting a number.`;
                } else if (rank < 0 || rank >= poll.choices.length) {
                    throw `Error: ${value} is out of range (1..${poll.choices.length})`;
                } else if (values[rank]) {
                    throw `Error: You ranked two candidates #${value}.`;
                } else if (taken.has(rmap[key])) {
                    throw `Error: You ranked ${key} twice.`;
                } else {
                    values[rank] = key;
                    taken.add(rmap.get(key));
                }
            }

            if (taken.size != poll.choices.length) {
                throw `Error: You are missing some rankings. Please do not delete any lines.`;
            }
        } catch (reply) {
            return await modal.reply({ content: reply, ephemeral: true });
        }

        const ids = values.map((key) => rmap.get(key));

        await set_vote(id, uid, ids);

        await modal.reply({
            content: `Your vote has been set to **${ids
                .map((id) => `<@${id}>`)
                .join(" > ")}**.`,
            ephemeral: true,
        });
    } else if (args[2] == "abstain") {
        if (poll.type == "election" && poll.choices.includes(uid)) {
            return "You may not vote in an election you are running in.";
        }

        await set_vote(id, uid, -1);
        return "You have chosen to ABSTAIN in this vote.";
    } else if (args[2] == "view") {
        const ballot = (poll.votes || {})[uid];

        if (!ballot) return "You have not voted yet.";
        if (ballot == -1) return "You have chosen to abstain.";

        if (poll.type == "election") {
            return `Your current vote is: **${ballot
                .map((id) => `<@${id}>`)
                .join(" > ")}**.`;
        }

        return `Your current vote is: \`${ballot}\`.`;
    } else if (args[2] == "info") {
        let header;

        if (poll.type == "proposal" || poll.type == "selection") {
            header = `**[ ${poll.id} ]**\n\n__${poll.question}__`;
        } else if (poll.type == "election") {
            header = `**[ ${poll.id} ]** (election)\n\n__Wave ${poll.question} Election for the TCN Executive Council__`;
        }

        return (
            header +
            `\n\n${
                poll.anon
                    ? "This poll is __anonymous__, so only observers are able to view who has voted, and cannot see the specific votes."
                    : "This poll is __not anonymous__, so everyone is able to see who has voted and for what."
            }\n${
                poll.live
                    ? "This poll will __update__ in real-time and show the results as the vote proceeds."
                    : "This poll's updates are __hidden__ and results will only be revealed when the vote concludes."
            }\n${
                poll.restrict
                    ? "This poll is __restricted__ to the primary council (designated voters)."
                    : "This poll is __open__ to all TCN HQ council members."
            }`
        );
    } else if (args[2] == "list") {
        if (poll.anon && !(await is_observer(uid))) {
            return "You do not have permission to view the votes of an anonymous poll.";
        }

        await interaction.deferReply({ ephemeral: true });

        const voted = [],
            abstained = [],
            waiting = [];

        const eligible = poll.restrict
            ? await get_voters()
            : await get_council();

        for (const voter of eligible) {
            const ballot = (poll.votes || {})[voter];

            let tag;
            try {
                tag = (await interaction.client.users.fetch(voter)).tag;
            } catch {
                tag = "(Error fetching tag)";
            }

            if (ballot === undefined) {
                waiting.push([tag, voter]);
            } else if (ballot == -1) {
                (poll.anon ? voter : abstained).push([tag, voter]);
            } else {
                let vote;

                if (poll.type == "proposal") {
                    vote = ballot == "yes" ? "🟩" : "🟥";
                } else if (poll.type == "election") {
                    vote = (
                        await Promise.all(
                            ballot.map(
                                async (id) =>
                                    (
                                        await interaction.client.users.fetch(id)
                                    )?.tag
                            )
                        )
                    ).join(" > ");
                } else {
                    vote = ballot;
                }

                voted.push([tag, voter, vote]);
            }

            voted.sort();
            abstained.sort();
            waiting.sort();
        }

        await interaction.editReply({
            files: [
                {
                    attachment: Buffer.from(
                        `${(
                            (1 - waiting.length / eligible.length) *
                            100
                        ).toFixed(2)}% turnout reached\n` +
                            [
                                voted.map(
                                    ([tag, id, vote]) =>
                                        `✅ ${tag} (${id})${
                                            poll.anon ? "" : `: ${vote}`
                                        }`
                                ),

                                abstained.map(
                                    ([tag, id]) => `✅ ${tag} (${id}): 🟨`
                                ),

                                waiting.map(([tag, id]) => `❌ ${tag} (${id})`),
                            ]
                                .flat()
                                .join("\n"),
                        "utf-8"
                    ),
                    name: "voters.txt",
                },
            ],
        });
    }
}
