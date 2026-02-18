const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Benutzer finden
    const user = await client.query(
      q.Let(
        {
          userRef: q.Match(q.Index('users_by_username'), username)
        },
        q.If(
          q.Exists(q.Var('userRef')),
          q.Get(q.Var('userRef')),
          null
        )
      )
    );

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Benutzer existiert nicht' })
      };
    }

    // Passwort prüfen (in Produktion: Hashing!)
    if (user.data.password !== password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Falsches Passwort' })
      };
    }

    // Session erstellen (30 Tage gültig)
    const session = await client.query(
      q.Create(q.Collection('sessions'), {
        data: {
          userId: user.ref.id,
          username: user.data.username,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': `session=${session.ref.id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`
      },
      body: JSON.stringify({ 
        message: 'Erfolgreich angemeldet',
        user: { username: user.data.username }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Fehler: ' + error.message })
    };
  }
};