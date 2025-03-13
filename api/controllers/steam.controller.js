// const {
//   getSessionMessages,
//   deleteSessionMessages,
// } = require('../helpers/firebase-helpers');

export const getFriends = async (req, res) => {
  try {
    const { steamId } = req.params;
    res.json({ steamId });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error });
  }
};
