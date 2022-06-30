import fetch from "node-fetch";

const API = "https://api.teyvatcollective.network";

export async function is_observer(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.exec || data.observer;
}

export async function is_voter(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return !!(data.roles & (1 << 8));
}

export async function is_council(user_id) {
    const response = await fetch(API + `/users/${user_id}`);
    if (!response.ok) return false;

    const data = await response.json();
    return !!(data.roles & ((1 << 6) | (1 << 7)));
}

export async function get_voters() {
    const response = await fetch(API + `/users/voters`);
    if (!response.ok) return [];

    const data = await response.json();
    return Object.keys(data);
}

export async function get_council() {
    const response = await fetch(API + `/users`);
    if (!response.ok) return [];

    const data = await response.json();
    return Object.keys(data).filter(
        (id) => data[id].roles & ((1 << 6) | (1 << 7))
    );
}
