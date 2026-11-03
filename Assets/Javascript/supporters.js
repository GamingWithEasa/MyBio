function showMessage(message) {
    const status = document.createElement("p");
    status.className = "status-message";
    status.textContent = message;
    container.replaceChildren(status);
}

function makeCard(supporter, index) {
    const card = document.createElement("article");
    card.className = "supporter-card";
    card.style.animationDelay = `${Math.min(index * 70, 700)}ms`;

    const avatar = document.createElement("img");
    avatar.className = "supporter-avatar";
    avatar.alt = `${supporter.name}'s profile picture`;
    avatar.loading = "lazy";
    avatar.referrerPolicy = "no-referrer";

    if (supporter.customimage) {
        avatar.src = supporter.customimage;
    } else if (supporter.discordid) {
        avatar.src = `https://cdn.discordapp.com/avatars/${encodeURIComponent(supporter.discordid)}/${encodeURIComponent(supporter.avatar)}.png?size=128`;
    } else {
        avatar.src = `https://discordpfp.gg/api/assets/user-silhouet/preview?variant=full&adult=0`;
    }

    const info = document.createElement("div");
    info.className = "supporter-info";

    const name = document.createElement("h2");
    name.className = "supporter-name";
    name.textContent = supporter.name;
    info.appendChild(name);

    const date = document.createElement("p");
    date.className = "supporter-date";
    date.textContent = `Date: ${supporter.date || "Not provided"}`;
    info.appendChild(date);

    if (supporter.note) {
        const note = document.createElement("p");
        note.className = "supporter-note";
        note.textContent = supporter.note;
        info.appendChild(note);
    }

    card.append(avatar, info);
    // loadDiscordAvatar(supporter.discordid, avatar, index);
    return card;
}

// async function loadDiscordAvatar(discordId, image, index) {
//     if (!/^\d+$/.test(discordId)) {
//         return;
//     }

//     try {
//         const response = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(discordId)}`);
//         if (!response.ok) {
//             throw new Error(`Lanyard returned HTTP ${response.status}`);
//         }

//         const result = await response.json();
//         const user = result.success && result.data && result.data.discord_user;
//         if (!user) {
//             throw new Error("Lanyard response did not include a Discord user");
//         }

//         if (user.avatar) {
//             const format = user.avatar.startsWith("a_") ? "gif" : "png";
//             image.src = `https://cdn.discordapp.com/avatars/${encodeURIComponent(discordId)}/${encodeURIComponent(user.avatar)}.${format}?size=128`;
//         } else {
//             image.src = `https://cdn.discordapp.com/embed/avatars/${index % 6}.png`;
//         }
//     } catch (error) {
//         console.warn(`Couldn't load Discord avatar for supporter ${discordId}:`, error);
//     }
// }

async function loadOGSupporters() {
    const container = document.getElementById("ogSupportersList");

    try {
        const response = await fetch("../Json/supporters.json");
        if (!response.ok) {
            throw new Error(`Supporters data returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const supporters = Object.values(data)
            .filter((entry) => entry && typeof entry === "object")
            .map((entry) => {
                const name = typeof entry.name === "string" ? entry.name.trim() : "";
                const rawDate = typeof entry.date === "string" ? entry.date.trim() : "";
                return {
                    name,
                    date: rawDate && rawDate !== "00/00/00" ? rawDate : "",
                    note: typeof entry.note === "string" ? entry.note.trim() : "",
                    // discordid: typeof entry.discordid === "string" ? entry.discordid.trim() : "",
                    customimage: typeof entry.customimage === "string" ? entry.customimage.trim() : ""
                };
            })
            .filter((supporter) => supporter.name && supporter.name.toLowerCase() !== "name");

        if (supporters.length === 0) {
            showMessage("No Original Supporters have been added yet.");
            return;
        }

        // container.replaceChildren(...supporters.map(makeCard));
    } catch (error) {
        console.error("Couldn't load supporters:", error);
        showMessage("Original Supporters couldn't be loaded. Please try again later.");
    }
}

async function loadSupporters() {
    const container = document.getElementById("supportersList");

    try {
        const response = await fetch("../Json/supporters.json");
        if (!response.ok) {
            throw new Error(`Supporters data returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const supporters = Object.values(data)
            .filter((entry) => entry && typeof entry === "object")
            .map((entry) => {
                const name = typeof entry.name === "string" ? entry.name.trim() : "";
                const rawDate = typeof entry.date === "string" ? entry.date.trim() : "";
                return {
                    name,
                    date: rawDate && rawDate !== "00/00/00" ? rawDate : "",
                    // note: typeof entry.note === "string" ? entry.note.trim() : "",
                    // discordid: typeof entry.discordid === "string" ? entry.discordid.trim() : "",
                    customimage: typeof entry.customimage === "string" ? entry.customimage.trim() : ""
                };
            })
            .filter((supporter) => supporter.name && supporter.name.toLowerCase() !== "name");

        if (supporters.length === 0) {
            showMessage("No supporters have been added yet.");
            return;
        }

        container.replaceChildren(...supporters.map(makeCard));
    } catch (error) {
        console.error("Couldn't load supporters:", error);
        showMessage("Supporters couldn't be loaded. Please try again later.");
    }
}

loadOGSupporters();
loadSupporters();
