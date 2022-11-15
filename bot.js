require('dotenv').config();

const { Client, Intents, MessageEmbed } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const opus = require('@discordjs/opus')
const ytdl = require('ytdl-core');
const googleIt = require('google-it');
const spotifyApi = require('spotify-web-api-node');
const { validateURL } = require('ytdl-core');


var axios = require('axios');
var qs = require('qs');

const allIntents = new Intents(32767);
const client = new Client({ intents : allIntents })
const PREFIX = "`";


//basic_functions

// Ready
client.on('ready',()=>{
    client.user.setActivity({
        name : "Rick Astley - Never Gonna Give You Up",
        type : 'LISTENING',   
    });

    client.user.setStatus('idle');

    console.log("Bot Logged in!")
});

//spotify scopes
const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-modify-public'
];

//Voice
class clientVcChannels{                 // class for which objects denote connection in a VC in any server
    constructor(message,channel){
        this.connection = joinVoiceChannel({
            channelId : channel.channelId,
            guildId : message.guildId,
            adapterCreator : channel.guild.voiceAdapterCreator,
            selfDeaf : true,
            selfMute : false,
        });
        message.channel.send({
            embeds : [createSimpleEmbed("Joined the Channel Succesfully","<:yesssss:852861924659560458>","#007a30")]
        });
        this.guildId = message.guildId;
        this.channelId = message.channelId;
        this.player = createAudioPlayer({
            behaviors : {
                noSubscriber : NoSubscriberBehavior.Pause
            }
        }).setMaxListeners(100); // when a new vc joined creates a player

        this.connection.subscribe(this.player); // subscribe to that player
        this.playQueue = [];
        this.loop = false;
        this.currentSongName = '';
    }

    playMusic(songName,message){
        if(songName != ""){
            googleIt({ 'query' : `${songName} Youtube`, 'no-display' : true }).then((results)=>{
                var link = results[0].link;
                if(ytdl.validateURL(link)){
                    var audioResource = createAudioResource(ytdl(link, { 
                        filter: "audioonly",
                        quality: 'highestaudio',
                        highWaterMark: 1 << 25
                    }), { inlineVolume : true } );
                    this.player.play(audioResource);
                    this.currentSongName = songName;

                    message.channel.send({
                        embeds : [createSimpleEmbed(`Playing ${results[0].title}`,'🎵',"#007a30")]
                    });
                    
                    
                }else{
                    message.channel.send({
                        embeds : [ createSimpleEmbed(`Could not find ${songName}`,"❌",red) ]
                    });
                }
            }).catch(err=>{
                console.log(err);
                message.channel.send({
                    embeds : [ createSimpleEmbed("Something went wrong","❌",red) ]
                });
                if(this.playQueue.length > 0){
                    this.playMusic(this.playQueue.pop(),message);
                }
            });
        }else{
            message.channel.send({
                embeds : [ createSimpleEmbed("Please provide a song name","❌",red) ]
            });
        }

       
    }


}



var connections = []; // stores the curent VCs the client is in
var emptySpaces = []; // stores empty spaces created in connections due to bot disconnecting from a VC
var connections = [];

// defining colors
const red = '#ad0808';
const green = "#007a30";


//User-Functions
function createSimpleEmbed(message,emoji,color){        // Simple embeds consisting of a message, optional emoji and optional color
    var embed = new MessageEmbed()
        .setTitle(`***${emoji} ${message}***`)
        .setColor(color)
        ;
    
    return embed;
       
}

var myTimeout;

function checkGuildVC(guildId){//checks if the bot is present in the VC from connections array of the guild denoted by guildId. If found returns the array index where it was found
    var thisLocation = 0;
        var found = false;
        while (thisLocation < (connections.length) && !found){
            if(connections[thisLocation].guildId == guildId){
                found = true;
            }else{
                thisLocation += 1;
            }
        }
    return [found,thisLocation];
}

//spotify-init

var access_token;
var refresh_token = 'AQBRRs7GHlohXhSJAndu_7Rqqqk47nit___Ueb-sUW9nmMtAWrS50nM3T0fuSjEBaEx_hHwy4NEa-pwb-G9nRH4enscSDcVNDosn_1Gmda-EFPft5KhQWT7rmC_SkbU4jtA';

var spotify = new spotifyApi({
    clientId : process.env.client_id,
    client_secret : process.env.client_secret,
    redirectUri : 'https://khelxa.000webhostapp.com'
});
//token refresher
function refreshToken(){
    var data = qs.stringify({
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token 
      });
      var config = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: { 
          'Authorization': 'Basic MjRkMTZiOWMwMzA3NDI2OGEzNzNkYWI2ZDIxZjZkYjg6NzhlYmRkMThmODhkNGFjZjlmM2RmOWIxYTBkMmMxZWY=', 
          'Content-Type': 'application/x-www-form-urlencoded', 
          'Cookie': '__Host-device_id=AQARd_fr-WNF91Yu-ZY9jeX6QM874gMlDiniHw45BK4e8GHNnuKJV1kBwaff0SsvJ9uxj6EfWyp70zPqMhBQpPsVbMKfnTROa7s; sp_tr=false'
        },
        data : data
      };
      
      axios(config)
      .then(function (response) {
        var res = JSON.parse(JSON.stringify(response.data));
        access_token = res.access_token;
      })
      .catch(function (error) {
        console.log(error);
      });
      
}

client.on('guildMemberAdd',(member)=>{
    try{
        var newComplexMessageEmbed = new MessageEmbed()
            .setAuthor({name : member.displayName, iconURL : member.displayAvatarURL()})
            .setColor(`#437704`)
            .setImage(`https://c.tenor.com/sO7pXz7Bw2MAAAAC/hello-welcome.gif`)
            .setDescription(`**Welcome to the server ${member}. Verify yourself in the ${client.channels.cache.get('848444165296619540')} channel**`)
            .setThumbnail(client.guilds.cache.get('848443909235015711').iconURL())
                       
        member.guild.channels.cache.get('848452422220382240').send({
            content : `Hey, <@&848518788285726730>. ${member} has arrived`,
            embeds : [newComplexMessageEmbed]
        });
    }catch(err){
        console.log("Wrong guild!");
    }
});

client.on('guildMemberRemove',(member)=>{
    try{
        var newComplexMessageEmbed = new MessageEmbed()
            .setAuthor({name : member.displayName, iconURL : member.displayAvatarURL()})
            .setColor(`#8d0101`)
            .setImage(`https://c.tenor.com/x5xtbmjvToEAAAAC/bye-friend.gif`)
            .setDescription(`**Adiós ${member}.**`)
            .setThumbnail(client.guilds.cache.get('848443909235015711').iconURL())
                       
        member.guild.channels.cache.get('848452422220382240').send({
            content : `${member} has left the server.`,
            embeds : [newComplexMessageEmbed]
        });
    }catch(err){
        console.log("Wrong guild!");
    }
});

//message
client.on('messageCreate',(message)=>{
    if(!message.author.bot){
        var messageContent  = message.content;
        var attachment = message.attachments.size > 0?  message.attachments.values(): null;
        var siuMessage = messageContent.toLowerCase();

        if(siuMessage.startsWith('siu')){
            var randomNumber = Math.floor(Math.random() * 6) + 1;
            switch(randomNumber){
                case 1:
                    message.reply('https://tenor.com/view/siu-ronaldo-siu-cristiano-cristiano-ronaldo-siu-meme-gif-24574747');
                    break;
                
                case 2:
                    message.reply('https://tenor.com/view/ronaldo-ronaldo-united-ronaldo-manchester-ronaldo-man-utd-ronaldo-manchester-united-gif-23044067');
                    break;
                
                case 3:
                    message.reply('https://tenor.com/view/siuuuu-siiuu-siiii-cr7-celebration-gif-9888637');
                    break;

                case 4:
                    message.reply('https://tenor.com/view/ronaldo-siu-ronaldo-siuuu-hehehe-siuuu-insallah-hehehe-siu-essekogluessekdo-gif-23066823');
                    break;

                case 5:
                    message.reply('https://tenor.com/view/messi-siu-gif-20760337');
                    break;

                case 6:
                    message.reply('https://tenor.com/view/cristiano-ronaldo-celebrate-oh-yeah-gif-11515686');
                    break;

                case 7:
                    message.reply('https://tenor.com/view/eleven-elevensports-forthefans-goal-happy-gif-19850600');
                    break;
            }  

            
        }

        //HECTOOOOOR
        
        if(message.guildId == '848443909235015711' && message.type != "REPLY"){
            
            message.mentions.users.forEach((user)=>{
                if(user.id == '762217573764825109'){
                    message.channel.send({
                        files : ['./images/samip.gif']
                    });
                }else if(user.id == '734040441410027641'){
                    message.channel.send({
                        files : ['./images/aayush.gif']
                    });
                }else if(user.id == '760390629975916558'){
                    message.channel.send({
                        files : ['./images/rochak.gif']
                    });
                }
            })
        };
        

        if(messageContent.startsWith(PREFIX)){
            var [ command ,...args ] = messageContent.substring(1).split(' ');

            switch(command){
                case 'announce':
                    var [channel, ...others] = args;
                    var thisChannel = client.channels.cache.get(channel);

                    try{
                        if(thisChannel != null){

                            if(message.guildId != thisChannel.guildId){
                                message.reply({
                                    embeds : [createSimpleEmbed(`Channel is not present in this server`,"<:ds:970954342200930334>","RED")]
                                });
                                
                            }else{
                                if(others.length != 0){
                                    var customMessage = others.join(' ');
                                }else{
                                    var customMessage = ""
                                }
                                
                                if(customMessage!=""){
                                    if(attachment != null){
                                        client.channels.cache.get(channel).send({
                                            content : customMessage,
                                            files : Array.from(attachment)
                                        });
                                    }else{
                                        client.channels.cache.get(channel).send(customMessage);
                                    }
                                }else{
                                    message.reply("I need a thing to announce");
                                    message.channel.send('https://tenor.com/view/empty-shelves-john-travolta-confused-where-huh-gif-16456244')
                                }  
                            
                            }

                        }else{
                            message.author.send({
                                embeds : [createSimpleEmbed("Something went wrong while announcing. Check the Channel ID","<:home:997162184104747049>","RED")]
                            });
                        }

                    }catch(err){
                        console.log(err);
                    }
                    break;
                
                case 'warn':
                    var [mentioned, ...warning] = args;
                    try{
                        var user = client.users.cache.get(mentioned.slice(2,-1));
                    }catch(err){
                        console.log(err)
                    }

                    if(user != undefined && warning != ""){
                        user.send({
                            embeds : [
                                new MessageEmbed()
                                    .setAuthor({name : message.author.username, iconURL : message.author.displayAvatarURL()})
                                    .setTitle(`**warns you \nReason :** *${warning.join(' ')}*`)
                                    .setColor(`#8d0101`)
                            ]
                        })
                        .then(()=>{
                            message.channel.send({
                                embeds : [createSimpleEmbed(`${user.username}#${user.discriminator} You have been warned!`,"<:kneel:852862368672251934>","#ad0808")]
                            });
                        })
                        .catch(()=>{
                            message.channel.send({
                                embeds : [createSimpleEmbed(`Oops, ${user.username}#${user.discriminator} cannot be warned directly by DM`,"<:hehe:888090990030778388>","#ad0808")]
                            })
                        })
                    
                    }else{
                        if(user == undefined){
                            message.author.send(`Something went wrong with the warning in ***${message.guild.name}***. Maybe the username **${mentioned}** is wrong.`);
                        }else{
                            message.author.send(`Something went wrong with the warning in ***${message.guild.name}***. Maybe the **warning message** is empty.`);
                        }
                    }
                    
                    break;


                case 'join':
                        var channel = message.member.voice;
                        refreshToken();
                        setInterval(()=>{refreshToken()},360000);
                        if(channel.channelId != null){
                            var newClientVC = new clientVcChannels(message,channel);

                            var [found, thisLocation] = checkGuildVC(message.guildId); // checks if bot is already in a VC in the guild. Avoids writing twice for same Guild    
                                                                                       // which may cause defragmentation in the connections array
    
                            if(found){                                      // if bot is in a VC in the guild, overwrites the array element of connections which contained the  
                                connections[thisLocation].player.stop();
                                connections[thisLocation].connection.destroy();
                                connections[thisLocation] = newClientVC;    //  connection for the previous VC in the Guild in which the bot was.        
                            }else{
                                if(emptySpaces.length > 0){
                                    var thisSpace = emptySpaces.pop();
                                    connections[thisSpace] = newClientVC;   // if emptySpaces has an element, it means array already has some space in which connection is cut
                                                                            // stores new connection in that array element
                                }else{
                                    connections.push(newClientVC);          // all connections in connection array is active, so adds a new element to array
                                }

                                newClientVC.player.on('stateChange',()=>{
                                    if(!newClientVC.loop){
                                        if(newClientVC.player.state.status == 'idle' && newClientVC.playQueue.length > 0){
                                            newClientVC.playMusic(newClientVC.playQueue.pop(),message);
                                        }
                                    }else{
                                        if(newClientVC.player.state.status == 'idle'){
                                            newClientVC.playQueue.unshift(newClientVC.currentSongName);
                                            newClientVC.playMusic(newClientVC.playQueue.pop(),message);
                                        }
                                    }

                                    
                                });
                                
                            }
                        }else{
                            message.reply({ 
                                embeds : [createSimpleEmbed('Please, join a voice channel first','<:vc:889889404267687996>','RED')]
                             })
                        }
                        
                        
                        break;                
                    
                case 'dis':
                        var [found, foundLocation] = checkGuildVC(message.guildId); // checks if bot is in a VC in the guild 

                        if(found){ // bot is in a VC 
                            connections[foundLocation].player.stop();
                            connections[foundLocation].connection.disconnect(); // disconnects bot from VC
                            connections[foundLocation].connection.destroy();
                            message.channel.send({
                                embeds : [createSimpleEmbed("Left the voice channel succesfully", "<:notbad:852843754090922005>", "RED")]
                            })
                            if(foundLocation == connections.length - 1){ // if connection breaking is the last
                                connections.pop(connections[foundLocation]); // remove the element from the array
                            }else{
                                emptySpaces.push(foundLocation); // else emptySpaces stores which connection is broken in the connections array and marks it as empty
                                connections[foundLocation] = '';
                            }
                        }else{
                            message.reply({
                                embeds : [createSimpleEmbed("Not connected to a VC","<:shit:889889839158263828>","RED")]
                            });
                        }
                        break;
                                            
                case 'play':
                        var [found,thisLocation] = checkGuildVC(message.guildId);
                        if(!found){
                            message.reply({
                                embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                            });
                        }else{
                            var songName = args.join(' ');
                            connections[thisLocation].playMusic(songName,message);
                        }
                        

                        break;


                case 'pause':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);

                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'playing'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not playing anything to pause','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    connections[connectionIndex].player.pause();
                                    message.channel.send({
                                        embeds : [createSimpleEmbed('Paused the song succesfully','⏸️',green)]
                                    });
                                }
                            }

                            break;
                        
                case 'resume':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);

                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'paused'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not paused currently','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    connections[connectionIndex].player.unpause();
                                    message.channel.send({
                                        embeds : [createSimpleEmbed('Resuming play','▶️',green)]
                                    });
                                }
                            }

                            break;
                        
                case 'stop':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);

                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'playing' && thisPlayerStatus != 'paused'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not paused or playing currently','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    connections[connectionIndex].loop = false;
                                    connections[connectionIndex].playQueue = [];
                                    connections[connectionIndex].player.stop();
                                    message.channel.send({
                                        embeds : [createSimpleEmbed('Play stopped','⏹️',red)]
                                    });
                                }
                            }

                            break;

                case 'queue':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);

                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                if(args.length == 0){
                                    message.channel.send({
                                        embeds : [ createSimpleEmbed("Please provide a song name","❌",red) ]
                                    });
                                }else{
                                    var thisConnection = connections[connectionIndex];
                                    var songName = args.join(' ');
                                    if(thisConnection.player.state.status == 'idle'){
                                        thisConnection.playMusic(songName,message);
                                    }else{
                                        googleIt({'query':`${songName} youtube`, 'no-display' : true})
                                            .then(results=>{
                                                var link = results[0].link;
                                                if(ytdl.validateURL(link)){
                                                    thisConnection.playQueue.unshift(results[0].title);
                                                    message.channel.send({
                                                        embeds : [ createSimpleEmbed(`Added ${results[0].title} to queue`,':white_check_mark:',green) ]
                                                    });

                                                    if(thisConnection.loop){
                                                        message.channel.send({
                                                            embeds : [ createSimpleEmbed(`Now looping the queue`,'🔄',green) ]
                                                        })
                                                    }
                                                }else{
                                                    message.channel.send({
                                                        embeds : [ createSimpleEmbed(`Could not find ${songName}`,"❌",red) ]
                                                    });
                                                }
                                            })

                                        
                                    }
                                }
                                
                            }

                        break;

                case 'skip':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);
                            
                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'playing' && thisPlayerStatus != 'paused'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not paused or playing currently','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    var thisConnection = connections[connectionIndex];
                                    if(thisConnection.playQueue.length > 0){
                                        thisConnection.playMusic(thisConnection.playQueue.pop(),message);
                                    }else{
                                        thisConnection.player.stop();
                                    }
                                    
                                }


                            }

                        break;

                case 'loop':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);
                            
                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }
                            else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'playing' && thisPlayerStatus != 'paused'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not paused or playing currently','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    connections[connectionIndex].loop = true;
                                    if(connections[connectionIndex].playQueue.length == 0){
                                        message.channel.send({
                                            embeds : [createSimpleEmbed('Looping the current song','🔄',green)]
                                        });
                                    }else{
                                        message.channel.send({
                                            embeds : [createSimpleEmbed('Looping the current queue','🔄',green)]
                                        });
                                    }
                                    
                                }   
                            }

                        break;

                case 'brloop':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);
                            
                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }
                            else{
                                var thisPlayerStatus = connections[connectionIndex].player.state.status;
                                if(thisPlayerStatus != 'playing' && thisPlayerStatus != 'paused'){
                                    message.reply({
                                        embeds : [createSimpleEmbed('Not paused or playing currently','<:ds:970954342200930334>',red)]
                                    });
                                }else{
                                    connections[connectionIndex].loop = false;
                                    connections[connectionIndex].playQueue = [];
                                    message.channel.send({
                                        embeds : [createSimpleEmbed('Loop stopped and queue is now empty','💤',green)]
                                    });
                                }   
                            }

                        break;

                case 'showqueue':
                            var [found, connectionIndex] = checkGuildVC(message.guildId);
                            
                            if(!found){
                                message.reply({
                                    embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                });
                            }else{
                                if(connections[connectionIndex].playQueue.length == 0){
                                    message.channel.send({
                                        embeds : [createSimpleEmbed(`Queue is currently empty`,`<:huh:852846803862552606>`,green)]
                                    });
                                }else{
                                    var songsInQueue = '';
                                    var thisConnection = connections[connectionIndex];
                                    var count = 1;
                                    for(var i = thisConnection.playQueue.length - 1 ; i>=0 ; i--){
                                        songsInQueue += `${count}. ${thisConnection.playQueue[i]}\n`;
                                        count += 1;
                                    }

                                    var newEmbed = new MessageEmbed()
                                        .setTitle('***Current Items in Queue: ***')
                                        .setDescription(`***${songsInQueue}***`)
                                    ;
                                    message.channel.send({
                                        embeds : [ newEmbed ]
                                    });
                                }
                            }

                        
                        break;

                case 'spotify':
                            if(args.length == 0){
                                message.channel.send({
                                    embeds : [ createSimpleEmbed("Please provide a playlist link","❌",red) ]
                                });
                            }else{
                                var [found, connectionIndex] = checkGuildVC(message.guildId);

                                if(!found){
                                    message.reply({
                                        embeds : [createSimpleEmbed('I am not in any VC currently','<:spiderman:852856751438692352>',red)]
                                    });
                                }else{
                                    var playlistLink = args[0];
                                    var playlistID =  playlistLink.substring(playlistLink.indexOf('playlist')+9).substring(0,22)
                                

                                    console.log(access_token);
                                    spotify.setAccessToken(access_token);
                                    spotify.getPlaylistTracks(playlistID)
                                        .then(data =>{
                                            if(connections[connectionIndex].player.state.status == 'idle'){
                                                var firstSong = data.body.items.pop();
                                                console.log(firstSong.track.artists);
                                                connections[connectionIndex].playMusic(`${firstSong.track.name} ${firstSong.track.artists[0].name}`,message);
                                            }
    
                                            data.body.items.forEach(item=>{
                                                googleIt({'query':`${item.track.name} youtube`, 'no-display' : true})
                                                .then(results=>{
                                                    try{
                                                        if(validateURL(results[0].link)){
                                                            connections[connectionIndex].playQueue.push(results[0].title);
                                                            
                                                        }
                                                    }catch(err){
                                                        console.log(err);
                                                    }
                                                    
                                                });
                                                
    
                                        });
                                });
                                }
                            }
                           
                            
                        break;

                        

                    
                    
                            
            }
        }
    }
})



//Login
client.login(process.env.bot_token);