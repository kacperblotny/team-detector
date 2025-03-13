import axios from 'axios';
import dotenv from 'dotenv';
import { Router } from 'express';
dotenv.config();

import { getFriends } from '../controllers/steam.controller.js';

const router = Router();

// Example endpoint
router.get('/', (req, res) => {
  res.send('inwigilator API');
});

// router.get('/friends/:steamId', getFriends);

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// ---------------------------------------------------------------------------
// 1) Endpoint to resolve a custom URL (vanity URL) to a SteamID64
//    GET /resolve/:vanityURL
//
//    Example usage:
//      GET http://localhost:3000/resolve/SomeCustomProfile
//    Response:
//      { success: 1, steamid: "76561197960435530" }
//      or
//      { success: 42, message: "No match" } (if it fails)
// ---------------------------------------------------------------------------

router.get('/resolve/:vanityURL', async (req, res) => {
  try {
    const vanityURL = req.params.vanityURL;

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Missing STEAM_API_KEY' });
    }

    const apiUrl = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(
      vanityURL
    )}`;

    const response = await axios.get(apiUrl);
    const data = response.data.response; // Steam returns { response: { success: ..., steamid: ... } }

    // data.success codes:
    // 1 = Success
    // 42 = No match
    // If it’s successful, you get the user’s steamid in data.steamid.
    return res.json(data);
  } catch (error) {
    console.error('Error in /resolve/:vanityURL:', error);
    return res.status(500).json({ error: 'Failed to resolve vanity URL' });
  }
});

// ---------------------------------------------------------------------------
// 2) Endpoint to get a friend list for a given SteamID64
//    GET /friends/:steamID
//
//    Example usage:
//      GET http://localhost:3000/friends/76561197960435530
//    Response:
//      {
//        "friendslist": {
//          "friends": [
//             {
//               "steamid": "76561197964778553",
//               "relationship": "friend",
//               "friend_since": 1636242357
//             },
//             ...
//          ]
//        }
//      }
// ---------------------------------------------------------------------------
router.get('/friends/:steamID', async (req, res) => {
  try {
    const steamID = req.params.steamID;

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Missing STEAM_API_KEY' });
    }

    const apiUrl = `http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${STEAM_API_KEY}&steamid=${steamID}&relationship=friend`;

    const response = await axios.get(apiUrl);
    // According to the docs, the JSON structure is:
    // { friendslist: { friends: [...] } }
    return res.json(response.data);
  } catch (error) {
    console.error('Error in /friends/:steamID:', error);
    return res.status(500).json({ error: 'Failed to fetch friends list' });
  }
});

// ---------------------------------------------------------------------------
// 3) Endpoint to show a user’s avatar and nickname
//    GET /profile/:steamID
//
//    Example usage:
//      GET http://localhost:3000/profile/76561197960435530
//    Response (example):
//      {
//        "steamid": "76561197960435530",
//        "personaname": "Robin",
//        "avatarfull": "https://...184_full.jpg"
//      }
// ---------------------------------------------------------------------------
router.get('/profile/:steamID', async (req, res) => {
  try {
    const steamID = req.params.steamID;

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Missing STEAM_API_KEY' });
    }

    const apiUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamID}`;
    const response = await axios.get(apiUrl);

    // The data should look like:
    //  {
    //    response: {
    //      players: [
    //        {
    //          steamid: '...',
    //          personaname: '...',
    //          avatar: '...',
    //          avatarmedium: '...',
    //          avatarfull: '...',
    //          ...
    //        }
    //      ]
    //    }
    //  }

    const players = response.data?.response?.players;
    if (!players || players.length === 0) {
      return res
        .status(404)
        .json({ error: 'No player found for given SteamID' });
    }

    const { steamid, personaname, avatarfull } = players[0];

    // Return just the fields we care about
    return res.json({
      steamid,
      personaname,
      avatarfull,
    });
  } catch (error) {
    console.error('Error in /profile/:steamID:', error);
    return res.status(500).json({ error: 'Failed to fetch user summary' });
  }
});

export default router;
