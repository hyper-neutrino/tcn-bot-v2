import { get_council, get_voters } from "./api.js";
import { alphabet_emojis } from "./utils.js";

export default async function (poll) {
    console.log(poll);

    const eligible = poll.restrict ? await get_voters() : await get_council();
    const eset = new Set(eligible);

    const title = `**[ ${poll.id} ]**`;
    const description = `**${
        poll.type == "election"
            ? `Please rank the candidates for the wave ${poll.question} executive election.`
            : poll.question
    }**`;

    const fields = [];

    const timestamp = Math.floor(poll.time.getTime() / 1000);

    fields.push({
        name: "Deadline",
        value: `<t:${timestamp}:f> (<t:${timestamp}:R>)`,
    });

    if (poll.live || poll.closed) {
        let value;

        if (
            !poll.live &&
            poll.closed &&
            poll.quorum &&
            poll.quorum * eligible.length >
                Object.keys(poll.votes).filter((id) => eset.has(id)).length
        ) {
            value =
                "Quorum was not reached so the results will not be shown yet.";
        } else {
            const { scores, abstain, total } = tally(poll, eset);

            if (poll.type == "proposal") {
                const { yes, no } = scores;
                const size = 10;
                const left = Math.round((size * yes) / (yes + no));
                const right = size - left;

                value = `⬆️ ${yes}   ${"🟩".repeat(left)}${
                    yes + no == 0 ? "⬜".repeat(size) : "🟥".repeat(right)
                }   ${no} ⬇️\n\n(${((yes / (yes + no || 1)) * 100).toFixed(
                    2
                )}% approval)`;
            } else if (poll.type == "selection") {
                value = Object.keys(scores)
                    .map(
                        (key) =>
                            `${key} - **${scores[key]} vote${
                                scores[key] == 1 ? "" : "s"
                            }** (${((scores[key] / (total || 1)) * 100).toFixed(
                                2
                            )}%)`
                    )
                    .join("\n");
            } else if (poll.type == "election") {
                value = Object.keys(scores)
                    .map((key) => `<@${key}> - **score: ${scores[key]}**`)
                    .join("\n");
            }

            value += `\n\n${abstain} voter${
                abstain == 1 ? "" : "s"
            } abstained.`;
        }

        fields.push({
            name: "Results",
            value,
        });
    }

    const components = [];

    if (poll.type == "proposal") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "BUTTON",
                    style: "SUCCESS",
                    customId: `poll.${poll.id}.yes`,
                    emoji: "⬆️",
                    disabled: poll.closed,
                },
                {
                    type: "BUTTON",
                    style: "DANGER",
                    customId: `poll.${poll.id}.no`,
                    emoji: "⬇️",
                    disabled: poll.closed,
                },
            ],
        });
    } else if (poll.type == "selection") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "SELECT_MENU",
                    customId: `poll.${poll.id}.select`,
                    options: poll.choices.map((option, index) => ({
                        label: option,
                        value: option,
                        emoji: alphabet_emojis[index],
                    })),
                    disabled: poll.closed,
                },
            ],
        });
    } else if (poll.type == "election") {
        components.push({
            type: "ACTION_ROW",
            components: [
                {
                    type: "BUTTON",
                    style: "PRIMARY",
                    customId: `poll.${poll.id}.trigger`,
                    label: "VOTE",
                    disabled: poll.closed,
                },
            ],
        });
    }

    components.push({
        type: "ACTION_ROW",
        components: [
            {
                type: "BUTTON",
                style: "PRIMARY",
                customId: `poll.${poll.id}.abstain`,
                emoji: "🤐",
                label: "ABSTAIN",
                disabled: poll.closed,
            },
            {
                type: "BUTTON",
                style: "SECONDARY",
                customId: `poll.${poll.id}.view`,
                label: "VIEW YOUR VOTE",
            },
            {
                type: "BUTTON",
                style: "SECONDARY",
                customId: `poll.${poll.id}.info`,
                emoji: "ℹ️",
            },
            {
                type: "BUTTON",
                style: "SECONDARY",
                customId: `poll.${poll.id}.list`,
                emoji: "🗳️",
                label: "VIEW VOTERS",
            },
        ],
    });

    return {
        embeds: [{ title, description, fields, color: "50fccf" }],
        components,
    };
}

function tally(poll, eset) {
    const ballots = Object.keys(poll.votes)
        .filter((id) => eset.has(id))
        .map((key) => poll.votes[key]);

    let abstain = 0;
    let total = 0;

    const scores = {};

    for (const ballot of ballots) {
        if (ballot == -1) {
            ++abstain;
            ++total;
        }
    }

    if (poll.type == "proposal") {
        scores.yes = scores.no = 0;
        for (const ballot of ballots) {
            if (ballot == -1) continue;
            ++scores[ballot];
            ++total;
        }
    } else if (poll.type == "selection") {
        for (const key of poll.choices) scores[key] = 0;
        for (const ballot of ballots) {
            if (ballot == -1) continue;
            ++scores[ballot];
            ++total;
        }
    } else if (poll.type == "election") {
        for (const key of poll.choices) scores[key] = 0;
        for (const ballot of ballots) {
            if (ballot == -1) continue;
            ballot.forEach((id, index) => (scores[id] += index + 1));
            ++total;
        }
    }

    return { scores, abstain, total };
}
