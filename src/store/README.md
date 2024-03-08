# Store
We use redux as a state manager of our application:
https://redux.js.org/

All actions that have a s/ prefix are shared between popups with the parent / popUp middlewares
Actions that are one-way signals, like notifications for window open / closed are prefixed with t/
