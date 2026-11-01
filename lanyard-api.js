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

    // 5. Current Activity (Rich Presence / Playing / Streaming / Listening / Watching)
    const mainActivity = activities.find(act => act.type !== 4);
    if (mainActivity) {
        // if (mainActivity.type === 0) {
        //   document.getElementById('discord-activity').innerText = `Playing ${mainActivity.name}`;
        // } else if (mainActivity.type === 1) {
        //   document.getElementById('discord-activity').innerText = `Streaming ${mainActivity.name}`;
        // } else if (mainActivity.type === 2) {
        //   document.getElementById('discord-activity').innerText = `Listening to ${mainActivity.details || ''} - ${mainActivity.state}`;
        // } else if (mainActivity.type === 3) {
        //   document.getElementById('discord-activity').innerText = `Watching ${mainActivity.name}`;
        // }

        const stringFromType = (type) => {
          switch (type) {
            case 0:
              return "Playing";
            case 1:
              return "Streaming";
            case 2:
              return "Listening to";
            case 3:
              return "Watching";
            default:
              return "";
          }
        };
        document.getElementById('discord-activity').innerText = stringFromType(mainActivity.type)
          + " " + mainActivity.name;

        document.getElementById('activity-stats-title').innerText = mainActivity.details
        document.getElementById('activity-stats-description').innerText = mainActivity.assets?.large_text

        const assets = mainActivity.assets;
        const activityImage = document.getElementById('activity-img');
        const activityImageSmall = document.getElementById('activity-status-indicator')
        
        const largeImageAsset = assets?.large_image;
        let largeImageUrl = '';

        if (largeImageAsset?.startsWith('mp:')) {
          largeImageUrl = `https://media.discordapp.net/${largeImageAsset.slice(3)}?size=160&keep_aspect_ratio=false`;
        } else if (largeImageAsset?.startsWith('https://')) {
          largeImageUrl = largeImageAsset;
        } else if (largeImageAsset && mainActivity.application_id) {
          largeImageUrl = `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${largeImageAsset}.png?size=160`;
        }

        activityImage.style.display = largeImageUrl ? 'block' : 'none';
        activityImage.src = largeImageUrl || '';
        
        const smallImageAsset = assets?.small_image;
        let smallImageUrl = '';
                  
        if (smallImageAsset?.startsWith('mp:')) {
          smallImageUrl = `https://media.discordapp.net/${smallImageAsset.slice(3)}?size=160&keep_aspect_ratio=false`;
        } else if (smallImageAsset?.startsWith('https://')) {
          smallImageUrl = smallImageAsset;
        } else if (smallImageAsset && mainActivity.application_id) {
          smallImageUrl = `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${smallImageAsset}.png?size=160`;
        }

        activityImageSmall.style.display = smallImageUrl ? 'block' : 'none';
        activityImageSmall.src = smallImageUrl || '';
    } else {
      document.getElementById('discord-activity').innerText = '';
      const activityImage = document.getElementById('activity-img');
      activityImage.removeAttribute('src');
      activityImage.style.display = 'none';
    }

  } catch (error) {
    console.error('Error fetching Lanyard data:', error);
  }
}

// Initial fetch and auto-refresh every 30 seconds
loadDiscordCard();
setInterval(loadDiscordCard, 5000);