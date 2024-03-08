import SocketEvents from './SockEvents';
import MessageBroker from './MessageBroker';
import { SHARD_NAME } from '../core/config';

/*
 * if we are a shard in a cluster, do messaging to others via redis
 */
const socketEvents = (SHARD_NAME) ? new MessageBroker() : new SocketEvents();

export default socketEvents;
