import React, { useEffect, useState } from 'react';

const TeamDetector = () => {
  const [battleUrl, setBattleUrl] = useState('');
  const [steamUrl, setSteamUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  // Keep an array of { nickname, steamId } objects in localStorage
  const [storedPlayers, setStoredPlayers] = useState(() => {
    const data = localStorage.getItem('battlePlayers');
    return data ? JSON.parse(data) : [];
  });

  // Use the Express endpoint to scrape content.
  const scrape = async (url) => {
    try {
      const proxyUrl = `http://localhost:3000/scrape?url=${encodeURIComponent(
        url
      )}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      return text;
    } catch (error) {
      console.error(`Could not scrape: ${url}`, error);
      return null;
    }
  };

  // Extract players from the Battlemetrics URL.
  const getPlayers = async (url) => {
    const content = await scrape(url);
    if (!content) {
      alert('Could not scrape Battlemetrics Server Page x');
      return [];
    }
    const regex = /<a class="css-fj458c" href="\/players\/\d+?">(.+?)<\/a>/g;
    const players = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      players.push(match[1]);
    }
    // Remove the localStorage save here
    // localStorage.setItem('battlePlayers', JSON.stringify(players));
    // setStoredPlayers(players);
    if (players.length === 0) {
      alert('Could not match players on the Battlemetrics Server Page. xxx');
    }
    return players;
  };

  // Extract friend list details from a given Steam URL.
  const getFriendList = async (url) => {
    // Ensure the URL ends with '/friends'
    if (!url.includes('friends')) {
      url = url.endsWith('/') ? `${url}friends` : `${url}/friends`;
    }
    const content = await scrape(url);
    if (!content) {
      alert('Could not scrape friend list page');
      return null;
    }
    // Extract the profile name.
    const nameMatch = content.match(
      /<meta property="og:title" content="(.+?)">/
    );
    const name = nameMatch ? nameMatch[1] : 'Unknown';

    // Extract the steamID.
    const steamIdMatch = content.match(/,"steamid":"(.+?)",/);
    const steamId = steamIdMatch ? steamIdMatch[1] : 'Unknown';

    // Extract friends. The regex below may need adjusting depending on the HTML.
    const friendRegex =
      /data-steamid="(.+?)".*?<div class="friend_block_content">(.+?)<br>/gs;
    const friends = [];
    let friendMatch;
    while ((friendMatch = friendRegex.exec(content)) !== null) {
      // Trim whitespace from the friend's name.
      friends.push([friendMatch[1], friendMatch[2].trim()]);
    }
    return { name, steamId, friends };
  };

  // Compare the Battlemetrics players list with a friend list.
  const comparePlayers = (battlemetricsPlayers, friendList) => {
    return friendList.filter(([steamId, name]) =>
      battlemetricsPlayers.includes(name)
    );
  };

  // Main function that mimics the original algorithm.
  const runTeamDetector = async () => {
    setLoading(true);
    let graphEdges = [];
    const battlemetricsPlayers = await getPlayers(battleUrl);
    const initialFriendList = await getFriendList(steamUrl);
    if (!initialFriendList) {
      setLoading(false);
      return;
    }
    let friends = { [initialFriendList.steamId]: initialFriendList.name };
    let leftToCheck = comparePlayers(
      battlemetricsPlayers,
      initialFriendList.friends
    );

    leftToCheck.forEach((friend) => {
      graphEdges.push({ from: initialFriendList.name, to: friend[1] });
    });

    // BFS loop
    while (leftToCheck.length > 0) {
      let newLeft = [];
      for (let [steamId, name] of leftToCheck) {
        const friendList = await getFriendList(
          `https://steamcommunity.com/profiles/${steamId}`
        );
        if (!friendList) continue;
        friends[friendList.steamId] = friendList.name;

        const compared = comparePlayers(
          battlemetricsPlayers,
          friendList.friends
        );
        compared.forEach(([steamIdC, nameC]) => {
          graphEdges.push({ from: friendList.name, to: nameC });
          if (
            !friends.hasOwnProperty(steamIdC) &&
            !newLeft.some((pair) => pair[0] === steamIdC)
          ) {
            newLeft.push([steamIdC, nameC]);
          }
        });
      }
      leftToCheck = newLeft;
    }

    setResult({ friends, edges: graphEdges, battlemetricsPlayers });

    // Store final players as nickname/steamId objects
    const foundPlayers = Object.entries(friends).map(([steamId, nickname]) => ({
      nickname,
      steamId,
    }));
    localStorage.setItem('battlePlayers', JSON.stringify(foundPlayers));
    setStoredPlayers(foundPlayers);
    setLoading(false);
  };

  return (
    <div className='p-6 max-w-3xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Team Detector</h1>
      <div className='mb-4'>
        <label className='block text-sm font-medium mb-1' htmlFor='battleUrl'>
          Battlemetrics URL
        </label>
        <input
          id='battleUrl'
          type='text'
          placeholder='Enter Battlemetrics URL'
          value={battleUrl}
          onChange={(e) => setBattleUrl(e.target.value)}
          className='w-full px-3 py-2 border rounded shadow-sm focus:outline-none'
        />
      </div>
      <div className='mb-4'>
        <label className='block text-sm font-medium mb-1' htmlFor='steamUrl'>
          Steam Profile URL
        </label>
        <input
          id='steamUrl'
          type='text'
          placeholder='Enter Steam Profile URL'
          value={steamUrl}
          onChange={(e) => setSteamUrl(e.target.value)}
          className='w-full px-3 py-2 border rounded shadow-sm focus:outline-none'
        />
      </div>
      <button
        onClick={runTeamDetector}
        disabled={loading}
        className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded'
      >
        {loading ? 'Processing...' : 'Run Team Detector'}
      </button>

      {result && (
        <div className='mt-8'>
          <h2 className='text-2xl font-semibold mb-4'>Team Detector Result</h2>
          <table className='min-w-full bg-white border text-black'>
            <thead>
              <tr>
                <th className='py-2 px-4 border'>Name</th>
                <th className='py-2 px-4 border'>SteamID</th>
                <th className='py-2 px-4 border'>Link</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.friends).map(([steamId, name]) => (
                <tr key={steamId}>
                  <td className='py-2 px-4 border'>{name}</td>
                  <td className='py-2 px-4 border'>{steamId}</td>
                  <td className='py-2 px-4 border'>
                    <a
                      href={`https://steamcommunity.com/profiles/${steamId}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline'
                    >
                      Profile
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='mt-6'>
            <h3 className='text-xl font-semibold mb-2'>Saved Players</h3>
            <ul className='list-disc ml-6'>
              {storedPlayers.map((player, index) => (
                <li key={index}>
                  <button
                    onClick={() =>
                      setSteamUrl((prev) =>
                        prev ? `${prev} ${player.steamId}` : player.steamId
                      )
                    }
                    className='text-blue-600 hover:underline'
                  >
                    {player.nickname}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetector;
