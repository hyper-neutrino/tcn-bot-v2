import fetch from "node-fetch";

const API = "https://api.teyvatcollective.network";

export async function is_observer(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.roles.includes("observer");
}

export async function is_voter(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.roles.includes("voter");
}

export async function is_council(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return ["owner", "advisor"].some(role => data.roles.includes(role));
}

export async function get_voters() {
    const response = await fetch(API + `/users`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.filter(user => user.roles.includes("voter")).map(user => user.id);
}

export async function get_council() {
    const response = await fetch(API + `/guilds`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.map(guild => [guild.owner, guild.advisor]).flat().filter(x => x);
}
