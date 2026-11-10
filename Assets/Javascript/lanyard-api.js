// Keep track of the current activity timestamps globally for live client-side updates
let activeTimestamps = null;
let activityTimerId = null;

const ts_start = document.getElementById('ts-start');
const ts_end = document.getElementById('ts-end');

function wait(milliseconds){
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

const resolveImage = async (image, id = null) => {
    if (!image) {
        // no asset hash — fetch the app's icon hash from RPC endpoint
        if (!id) return null;

        try {
            const res = await fetch(`https://discord.com/api/v10/applications/${id}/rpc`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.icon
                ? `https://cdn.discordapp.com/app-icons/${id}/${data.icon}.png?size=512`
                : null;
        } catch {
            return null;
        }

        // alternatively, use Dustin's API:
        // return `https://dcdn.dstn.to/app-icons/${id}`;
    }

    if (image.startsWith("mp:external/")) {
        return image.replace("mp:external/", "https://media.discordapp.net/external/");
    }

    if (image.startsWith("spotify:")) {
        return `https://i.scdn.co/image/${image.replace("spotify:", "")}`;
    }

    if (!id) return null;

    // the idea here is that if purely numeric, its a rich presence asset (snowflake)
    // otherwise, its a game icon (hash)
    return /^\d+$/.test(image)
        ? `https://cdn.discordapp.com/app-assets/${id}/${image}.png?size=512`
        : `https://cdn.discordapp.com/app-icons/${id}/${image}.png?size=512&keep_aspect_ratio=false`;
};

function listActivities(activity, index) {
    const activityBox = document.createElement("div");
    activityBox.className = "activity-box discord-activity";

    const mainFrame = document.createElement("div");
    mainFrame.id = "main-frame"
    mainFrame.style = "display: flex; align-items: center; text-align: left;";

    const iconFrame = document.createElement("div");
    iconFrame.className = "discord-activity-icon";

    const mainIcon = document.createElement("img");
    mainIcon.className = "activity-img"; // Use class
    mainIcon.alt = "Activity Image";
    mainIcon.style = "border-radius: 10px;";

    const statusIcon = document.createElement("img");
    statusIcon.id = "activity-status-indicator";
    statusIcon.className = "status-dot-activity";
    statusIcon.style = "display: none;";
    
    // Resolve large image URL safely inside the renderer
    let imageUrl = "";
    const largeImg = activity.assets?.large_image;
    if (!largeImg) {
      resolveImage(largeImg, activity.application_id).then(url => {
        if (url) mainIcon.src = url;});
    } else if (largeImg?.startsWith('mp:')) {
        imageUrl = `https://media.discordapp.net/${largeImg.slice(3)}?size=160&keep_aspect_ratio=false`;
    } else if (largeImg?.startsWith('https://')) {
        imageUrl = largeImg;
    } else if (largeImg && activity.application_id) {
        imageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${largeImg}.png?size=160`;
    } else {
        imageUrl = "";
    }
    // mainIcon.style.display = imageUrl ? 'block' : 'none';
    // console.log(resolveImage(largeImg, activity.application_id))
    // imageUrl = resolveImage(largeImg, activity.application_id)
    mainIcon.src = imageUrl;
    
    imageUrl = "";
    const smallImg = activity.assets?.small_image;
    if (smallImg?.startsWith('mp:')) {
        imageUrl = `https://media.discordapp.net/${smallImg.slice(3)}?size=160&keep_aspect_ratio=false`;
    } else if (smallImg?.startsWith('https://')) {
        imageUrl = smallImg;
    } else if (smallImg && activity.application_id) {
        imageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${smallImg}.png?size=160`;
    } else {
        imageUrl = "";
    }
    statusIcon.style.display = imageUrl ? 'block' : 'none';
    statusIcon.src = imageUrl

    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";
    profileInfo.style = "width: 300px; margin-left: 12px;";
    
    // Activity Type Heading (e.g., "Playing", "Listening to")
    const statusTypeHeader = document.createElement("p");
    statusTypeHeader.id = "discord-activity"
    statusTypeHeader.className = "discord-activity-status";
    const typeStrings = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching" };
    statusTypeHeader.textContent = `${typeStrings[activity.type] || ""} ${activity.name}`.trim();

    // Details (Title)
    const statusTitle = document.createElement("div");
    statusTitle.className = "activity-stats-title";
    statusTitle.textContent = activity.details || "";
    
    // Description (State + Extra text)
    const statusDescription = document.createElement("div");
    statusDescription.className = "activity-stats-description";
    statusDescription.style = "color: #a0a0a0; text-align: left;";
    
    let descText = activity.state || "";
    if (activity.assets?.large_text) {
        descText += `<br>${activity.assets.large_text}`;
    }
    statusDescription.innerHTML = descText;

    const statusTimer = document.createElement("div");
    statusTimer.id = "activity-timer";
    statusTimer.style = "margin-top: 10px;";

    const statusTimerDiv = document.createElement("div");
    statusTimerDiv.className = "discord-activity-timer";
    
    const tsStart = document.createElement("div");
    tsStart.id = "ts-start";
    tsStart.className = "timer-timestamps-text";

    const timeline = document.createElement("div");
    timeline.id = "";
    timeline.className = "activity-timer-timeline";

    const tsEnd = document.createElement("div");
    tsEnd.id = "ts-end";
    tsEnd.className = "timer-timestamps-text";

    // activeTimestamps = activity.timestamps;
    // let activityTimerId = null;

    activeTimestamps = activity.timestamps;
    // console.log(activity, activeTimestamps);

    updateTimestampUI(tsStart, timeline, tsEnd)
    

    timeline.style.display = activeTimestamps.end ? 'block' : 'none';
    tsEnd.style.display = activeTimestamps.end ? 'block' : 'none';

    // if (activity.activeTimestamps.end) {
    //   timeline.display 
    //   tsEnd.style.display
    // }

    // Assemble components
    activityBox.appendChild(statusTypeHeader);
    activityBox.appendChild(mainFrame);

    mainFrame.appendChild(iconFrame);
    mainFrame.appendChild(profileInfo);

    iconFrame.appendChild(mainIcon);
    iconFrame.appendChild(statusIcon);

    profileInfo.appendChild(statusTitle );
    profileInfo.appendChild(statusDescription);
    profileInfo.appendChild(statusTimer);
    
    statusTimer.appendChild(statusTimerDiv);

    statusTimerDiv.appendChild(tsStart);
    statusTimerDiv.appendChild(timeline);
    statusTimerDiv.appendChild(tsEnd);

    return activityBox;
}

async function loadDiscordCard() {
  const USER_ID = '580864877497679892';
  const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to load Discord user data');
      return;
    }

    const { discord_user, discord_status, activities, kv } = result.data;

    // 1. Avatar URL Construction
    const avatarUrl = discord_user.avatar
      ? `https://cdn.discordapp.com/avatars/${USER_ID}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_user.discriminator) % 5}.png`;

    document.getElementById('discord-avatar').src = avatarUrl;

    // 2. Display Name & Username
    document.getElementById('discord-username').innerText = discord_user.global_name || discord_user.username;
    document.getElementById('discord-discriminator').innerText = `@${discord_user.username}`;

    // 3. Online Status Dot Class
    const statusDot = document.getElementById('discord-status-indicator');
    statusDot.className = `status-dot ${discord_status}`; // online, idle, dnd, offline

    if (discord_status === 'idle') {
        document.getElementById('idle').style.display = 'block';
    } else {
        document.getElementById('idle').style.display = 'none';
    } 
      
    if (discord_status === 'offline') {
        document.getElementById('offline').style.display = 'block';
    } else {
        document.getElementById('offline').style.display = 'none';
    }

    // 4. Custom Status (Type 4)
    const customActivity = activities.find(act => act.type === 4);
    const customStatusText = customActivity?.state || '';
    const customStatusEmoji = customActivity?.emoji?.name || '';

    if (customStatusText) {
      document.getElementById('status-placeholder').style.display = 'none';
    } else {
      document.getElementById('status-placeholder').style.display = 'block';  
    }

    document.getElementById('discord-custom-status').innerText = customStatusEmoji + ' ' + customStatusText;

    const activitiesContainer = document.getElementById("activities");

    const acts = Object.values(activities)
        .filter((entry) => entry && typeof entry === "object" && entry.type != 4)
        .map((entry) => {
            return {
                name: typeof entry.name === "string" ? entry.name.trim() : "",
                type: typeof entry.type === "number" ? entry.type : 0,
                details: typeof entry.details === "string" ? entry.details.trim() : "",
                state: typeof entry.state === "string" ? entry.state.trim() : "",
                timestamps: entry.timestamps || null,
                assets: entry.assets || null,
                application_id: entry.application_id || null
            };
        });

    if (!acts) {
        activitiesContainer.replaceChildren();
        return;
    }

    activitiesContainer.replaceChildren(...acts.map(listActivities));

    // 5. Current Activity (Rich Presence / Playing / Streaming / Listening / Watching)
    // const mainActivity = activities.find(act => act.type !== 4);
    // if (mainActivity) {
    //     // if (mainActivity.type === 0) {
    //     //   document.getElementById('discord-activity').innerText = `Playing ${mainActivity.name}`;
    //     // } else if (mainActivity.type === 1) {
    //     //   document.getElementById('discord-activity').innerText = `Streaming ${mainActivity.name}`;
    //     // } else if (mainActivity.type === 2) {
    //     //   document.getElementById('discord-activity').innerText = `Listening to ${mainActivity.details || ''} - ${mainActivity.state}`;
    //     // } else if (mainActivity.type === 3) {
    //     //   document.getElementById('discord-activity').innerText = `Watching ${mainActivity.name}`;
    //     // }

    //     const stringFromType = (type) => {
    //       switch (type) {
    //         case 0:
    //           return "Playing";
    //         case 1:
    //           return "Streaming";
    //         case 2:
    //           return "Listening to";
    //         case 3:
    //           return "Watching";
    //         default:
    //           return "";
    //       }
    //     };
    //     document.getElementById('discord-activity').innerText = stringFromType(mainActivity.type)
    //       + " " + mainActivity.name;

    //     document.getElementById('activity-stats-title').innerText = mainActivity.details
    //     document.getElementById('activity-stats-description').innerHTML = mainActivity.state + `<br>` + mainActivity.assets?.large_text

    //     const assets = mainActivity.assets;
    //     activeTimestamps = mainActivity.timestamps; // Save timestamps for the live interval ticker
    //     const activityImage = document.getElementById('activity-img');
    //     const activityImageSmall = document.getElementById('activity-status-indicator')
        
    //     const largeImageAsset = assets?.large_image;
    //     let largeImageUrl = '';

    //     if (largeImageAsset?.startsWith('mp:')) {
    //       largeImageUrl = `https://media.discordapp.net/${largeImageAsset.slice(3)}?size=160&keep_aspect_ratio=false`;
    //     } else if (largeImageAsset?.startsWith('https://')) {
    //       largeImageUrl = largeImageAsset;
    //     } else if (largeImageAsset && mainActivity.application_id) {
    //       largeImageUrl = `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${largeImageAsset}.png?size=160`;
    //     }

    //     activityImage.style.display = largeImageUrl ? 'block' : 'none';
    //     activityImage.src = largeImageUrl || '';
        
    //     const smallImageAsset = assets?.small_image;
    //     let smallImageUrl = '';
                  
    //     if (smallImageAsset?.startsWith('mp:')) {
    //       smallImageUrl = `https://media.discordapp.net/${smallImageAsset.slice(3)}?size=160&keep_aspect_ratio=false`;
    //     } else if (smallImageAsset?.startsWith('https://')) {
    //       smallImageUrl = smallImageAsset;
    //     } else if (smallImageAsset && mainActivity.application_id) {
    //       smallImageUrl = `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${smallImageAsset}.png?size=160`;
    //     }

    //     activityImageSmall.style.display = smallImageUrl ? 'block' : 'none';
    //     activityImageSmall.src = smallImageUrl || '';

    //     updateTimestampUI()
    // } else {
    //   activeTimestamps = null;
    //   document.getElementById('discord-activity').innerText = '';
    //   ts_start.innerText = '';
    //   ts_end.innerText = '';
    //   const activityImage = document.getElementById('activity-img');
    //   activityImage.removeAttribute('src');
    //   activityImage.style.display = 'none';
    // }

  } catch (error) {
    console.error('Error fetching Lanyard data:', error);
  }
}

// Formats standard duration in seconds into MM:SS or HH:MM:SS
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
}

// Computes current state relative to the live server clock time
function updateTimestampUI(s,l,e) {
  if (!e || !s) return;

  console.log('log is ' + activeTimestamps);
  

  if (!activeTimestamps) {
    s.innerText = '';
    e.innerText = '';
    return;
  }

  const now = Date.now(); // Current local time in milliseconds

  // Scenario A: Music / Media progress bar track (End timestamp provided)
  if (activeTimestamps.end) {
    const totalSeconds = Math.max(0, (activeTimestamps.end - activeTimestamps.start) / 1000);
    const currentSeconds = Math.min(totalSeconds, Math.max(0, (now - activeTimestamps.start) / 1000));
    
    s.innerText = formatDuration(currentSeconds);
    e.innerText = formatDuration(totalSeconds);
  } 
  // Scenario B: Game duration counter (Only Start timestamp provided -> "elapsed")
  else if (activeTimestamps.start) {
    const elapsedSeconds = Math.max(0, (now - activeTimestamps.start) / 1000);
    s.innerText = `${formatDuration(elapsedSeconds)} elapsed`;
    e.innerText = '';
  } 
  else {
    s.innerText = '';
    e.innerText = '';
  }
}


// await wait(5000)
// Initial fetch and auto-refresh every 30 seconds
loadDiscordCard();
setInterval(loadDiscordCard, 1000); 
// 30000

// Increment counter positions on the client side every 1 second for a live-ticking UI
// setInterval(updateTimestampUI, 1000);
// 1000