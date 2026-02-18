const faunadb = require('faunadb');
const q = faunadb.query;

// FaunaDB Client setup
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, email, password } = JSON.parse(event.body);

    // Prüfe ob Benutzer existiert
    const existingUser = await client.query(
      q.Let(
        {
          userByUsername: q.Match(q.Index('users_by_username'), username),
          userByEmail: q.Match(q.Index('users_by_email'), email)
        },
        q.If(
          q.Or(q.Exists(q.Var('userByUsername')), q.Exists(q.Var('userByEmail'))),
          true,
          false
        )
      )
    );

    if (existingUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Benutzername oder Email bereits vergeben' })
      };
    }

    // Benutzer erstellen
    const newUser = await client.query(
      q.Create(q.Collection('users'), {
        data: {
          username,
          email,
          password, // In Produktion hashen!
          createdAt: new Date().toISOString(),
          agbAccepted: true
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Konto erfolgreich erstellt',
        user: { username: newUser.data.username, email: newUser.data.email }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Fehler: ' + error.message })
    };
  }
};