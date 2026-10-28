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

    // 4. Custom Status (Type 4)
    const customActivity = activities.find(act => act.type === 4);
    const customStatusText = customActivity?.state || '';
    document.getElementById('discord-custom-status').innerText = customStatusText;

    // 5. Current Activity (Rich Presence / Playing / Streaming / Listening / Watching)
    const mainActivity = activities.find(act => act.type !== 4);
    if (mainActivity) {
        if (mainActivity.type === 0) {
          document.getElementById('discord-activity').innerText = `Playing ${mainActivity.name}`;
        } else if (mainActivity.type === 1) {
          document.getElementById('discord-activity').innerText = `Streaming ${mainActivity.name}`;
        } else if (mainActivity.type === 2) {
          document.getElementById('discord-activity').innerText = `Listening to ${mainActivity.details || ''} - ${mainActivity.name}`;
        } else if (mainActivity.type === 3) {
          document.getElementById('discord-activity').innerText = `Watching ${mainActivity.name}`;
        }
    } else {
      document.getElementById('discord-activity').innerText = '';
    }

  } catch (error) {
    console.error('Error fetching Lanyard data:', error);
  }
}

// Initial fetch and auto-refresh every 30 seconds
loadDiscordCard();
setInterval(loadDiscordCard, 30000);
