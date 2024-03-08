# Binary Websocket Packages

Note that the node Server receives and sends in [Buffer](https://nodejs.org/api/buffer.html), while the client receives [DataViews](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) and sends ArrayBuffers.
Therefore, the server can't share the same code with the client for hydrate / dehydrate, and it's split in two files.
