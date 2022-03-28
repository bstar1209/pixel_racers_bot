import { Client, MessageEmbed } from 'discord.js'

import {
  CLUSTERS,
  COMMAND_PREFIX,
  DISCORD_TOKEN,
  GUILD_ID,
  CHANNEL_ID,
} from './config/index.js'
import fetch from "node-fetch";
import Utils from './src/utils.js'

// Create a new discord client instance
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });
let guild = undefined;

let dangerColor = '#d93f71';
let infoColor = '#0099ff';

let guildId = "";
let channelId = "";

let totalTokens = [];
let totalOwners = [];
let totalMetadatas = [];
let totalTransactions = [];
let curBlockTime = 0;

// When the client is ready, run this code
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await initBot();
});

client.on('disconnected', function () {
  console.log('Disconnected!');
  process.exit(1); //exit node.js with an error
});

client.on('messageCreate', async (message) => {
  // Ignore the message if the prefix does not fit and if the client authored it.
  if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;

  let args = message.content.slice(COMMAND_PREFIX.length).trim().split(/ +/);
  let command = args[0];
  args = args.slice(1);

  if (command == "test") {
  }
});

const initBot = async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(CHANNEL_ID);

  let checkMintInterval = setInterval(async () => {
    let tokens = [];
    let transactions = [];
    try {
      tokens = await Utils.getMints();
      if (totalTokens.length == 0) {
        totalTokens = tokens;
      }
    } catch (error) {
      tokens = totalTokens;
      console.log('error detected')
    }

    try {
      transactions = await Utils.getLatestSellTxn(); 
      if (totalTransactions.length == 0) {
        totalTransactions = transactions;
      }     
    } catch (error) {
      transactions = totalTransactions;
      console.log('error transactions detected')
    }
    
    // get the difference to catch the new token.
    var difference = tokens.filter(elem => totalTokens.indexOf(elem) === -1);
    console.log(difference, totalTokens.length, tokens.length);

    // get the difference to catch the sell transaction      
    var differTxn = transactions.filter(({ signature: id1 }) => !totalTransactions.some(({ signature: id2 }) => id2 === id1));

    console.log(differTxn, transactions.length, totalTransactions.length);

    totalTransactions = transactions;

    if (difference.length > 0) { // detected new token
      try {        
        let metadata = await Utils.getMeta(difference[0]);
        totalMetadatas[difference[0]] = metadata;

        const embed = new MessageEmbed()
          .setColor(infoColor)
          .setTitle('Another degen joined the gang!')
          .setImage(metadata.metadata.image);

        for (let i = 0; i < metadata.metadata.attributes.length; i++) {
          const elem = metadata.metadata.attributes[i];
          embed.addField(`${elem.trait_type}`, `${elem.value}`, true);
        }

        channel.send({
          embeds: [embed]
        }).catch(error => {
          console.log(`Cannot send messages to this user`);
        });
      } catch (error) {
        console.log('error')
      }
    }

    if (differTxn.length > 0) { // detected new token
      console.log('--differ-txn--', differTxn);
      for(var i = 0; i < differTxn.length; i++ )
      {
        try 
        {              
          let txn_metadata = await Utils.getMeta(differTxn[i].mint);

          //console.log('--metadata--', txn_metadata);
          const txn_embed = new MessageEmbed()
            .setColor(infoColor)
            .setTitle('Another degen joined the gang!');

            txn_embed.setImage(txn_metadata.metadata.image); //txn_metadata.metadata.data.url
            txn_embed.addField('Name', txn_metadata.metadata.data.name, true); 
            txn_embed.addField('Selling Price', `${differTxn[i].price}`, true);                        

            channel.send({
              embeds: [txn_embed]
            }).catch(error => {
              console.log(`Cannot send messages to this user`);
            });                  
        } catch (error) {
          console.log('error', error);
        }
      }    
    }    
  }, 5000);  
}

try {
  // Login to Discord with your client's token
  client.login(DISCORD_TOKEN);
} catch (e) {
  console.error('Client has failed to connect to discord.');
  process.exit(1);
}