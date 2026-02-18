const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET
});

exports.handler = async (event, context) => {
  try {
    const sessionId = event.headers.cookie?.split('session=')[1]?.split(';')[0];
    
    if (sessionId) {
      // Session löschen
      await client.query(
        q.Delete(q.Ref(q.Collection('sessions'), sessionId))
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      },
      body: JSON.stringify({ message: 'Erfolgreich ausgeloggt' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Fehler' })
    };
  }
};