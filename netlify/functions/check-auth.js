const faunadb = require('faunadb');
const q = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET
});

exports.handler = async (event, context) => {
  try {
    const sessionId = event.headers.cookie?.split('session=')[1]?.split(';')[0];
    
    if (!sessionId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ authenticated: false })
      };
    }

    // Session validieren
    const session = await client.query(
      q.If(
        q.Exists(q.Ref(q.Collection('sessions'), sessionId)),
        q.Get(q.Ref(q.Collection('sessions'), sessionId)),
        null
      )
    );

    if (!session || new Date(session.data.expiresAt) < new Date()) {
      return {
        statusCode: 401,
        body: JSON.stringify({ authenticated: false })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        authenticated: true,
        user: { username: session.data.username }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Fehler' })
    };
  }
};