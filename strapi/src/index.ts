import { Server, Socket } from 'socket.io';
import { PendingAction, Action, TeamRole} from './types';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface Message {
  message: string;
  date: Date;
  sender: string;
  receiver: string;
}

//converts minutes to milliseconds
const minToMs = (min: number) => min * 60 * 1000;

// returns the user room string
// room string is both usernames in alphabetical order, separated by an ampersand
// e.g. 'user1&user2'
function getRoomName(sender: string, receiver: string) {
  return [sender, receiver].sort().join('&');
}

// checks the user's token
// returns the user's ID if the token is valid, otherwise returns null
async function checkToken(jwt: string) {
  if (!jwt) {
    return null;
  }
  try {
    const res = await strapi.plugins['users-permissions'].services.jwt.verify(jwt);
    return res.id as number;
  } catch (error) {
    return null;
  }
}

// checks if the receiver is valid (i.e. exists and is on the same team as the sender)
async function checkReceiver(userId: number, receiver: string) {
  const res = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
    populate: ['team']
  });
  const teamName = res.team.name;
  const teammates = await strapi.entityService.findMany('plugin::users-permissions.user', {
    fields: ['username'],
    populate: ['team'],
    filters: {
      username: receiver,
      team: {
        name: teamName
      }
    }
  });
  return teammates.length > 0;
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ /* strapi */ }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: [`${FRONTEND_URL}`], //dashboard, can add other origins
        methods: ['GET', 'POST'],
      },
    });

    // game logic process socket
    // TODO: probably not secure, make sure this is not accessible from outside localhost (use a secret key maybe?)
    const gameLogicSocket = io.of('/game-logic');
    gameLogicSocket.on('connection', () => {
      console.log('game-logic connected');
    });

    io.on('connection', async (socket) => {
      // check user jwt
      const userId = await checkToken(socket.handshake.auth.token);
      if (!socket.handshake.auth.token || !userId) {
        console.error('user connected without valid token, disconnecting...');
        socket.emit('error', 'Invalid token');
        socket.disconnect();
        return;
      }
      
      console.log('user connected with ID ' + socket.id + ' at ' + new Date().toISOString());

      // listen for messages, add to strapi, and emit to room
      socket.on('message', async (message: Message) => {
        const validReceiver = await checkReceiver(userId, message.receiver);
        if (!validReceiver) {
          console.error('user ' + userId + ' attempted to send message to invalid receiver ' + message.receiver);
          socket.emit('error', 'Invalid receiver');
          socket.disconnect();
          return;
        }
        socket.to(getRoomName(message.sender, message.receiver)).emit('message', message);
        const res = await strapi.entityService.create('api::message.message', {
          data: {
            message: message.message,
            date: message.date,
            sender: message.sender,
            receiver: message.receiver,
          }
        });
        gameLogicSocket.emit('message', message.message);
      });

      // join room when user connects
      socket.on('join-room', async (users: string[]) => {
        const validReceiver = await checkReceiver(userId, users[1]);
        if (!validReceiver) {
          console.error('user ' + userId + ' attempted to join room with invalid receiver ' + users[1]);
          socket.emit('error', 'Invalid receiver');
          socket.disconnect();
          return;
        }
        socket.join(getRoomName(users[0], users[1]));
      });

      //pending action queue logic

      //let fooAction: Action = { name: 'testAction', duration: 10, teamRole: TeamRole.Leader, description: 'this is a test'};

      //TODO: change the type of submittedAction to pendingAction/resolvedAction

      // listens for actions, adds to pending queue
      socket.on('action', async (submittedAction: Action) => {
        const res = await strapi.entityService.create('api::pending-action.pending-action', {
          data: {
            user: 'aa',
            date: new Date(Date.now() + minToMs(submittedAction.duration)),
            action: submittedAction,
          }
        });
      });

      // listens for pending actions that need to be added to the resolved queue
      socket.on('finalizedAction', async (pendingAction: Action) => {
        const res = await strapi.entityService.create('api::resolved-action.resolved-action', {
          data: {
            user: 'aa',
            date: Date.now(),
            action: pendingAction,
          }
        });
      });
    });
  }
};
