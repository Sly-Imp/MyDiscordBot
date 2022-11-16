# Aayush Discord bot and Commands
Language : node.js

Library : discord.js

Prefix : `

Principles behind VC:

    - when a new VC is joined, an object of ClientVcChannels is create

    - the object includes a player and channel subscribes to the player

    - finding songs : google-it finds links in google. query contains songname concatenated with youtube

    - ytdl downloads the songs and sends it in a stream to player

    - since, for each VC connection seperate connection is created, bot remains in vc in seperate servers

    - each object is stored in the connections array

    - each object has a property of guildId storing which guild it is from. prevents command from one guild
     affecting another


Principles behind queue:

    - each connection object has a playQueue array

    - when user types '~queue' command, the song is added to front of queue

    - when player state changes to idle and playQueue has some items, the item is popped and played.


Principles behind loop:

    - each connection object has loop boolean
    
    - loop is true if user chooses to loop

    - if a song is being played( playQueue is empty ), the song is added to playQueue. onStateChange to idle,
     the song is played and unshifted back to the array

    - if playQueue is not empty, item popped goes to front of array, so the queue ends up looping.


Principles behind Spotify:

    - Reads the playlist from ID [ Extracted as the 22 characters after the word 'playlist' in the link ]

    - Takes each song and adds it to the playQueue

    - If currently not playing, the first song is played
